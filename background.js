let timerStarted = false;
let nonEducationalTimerStarted = false;
const educationalKeywords = ["tutorial", "lecture", "lesson", "course", "how to", "education"];
const cooldownPeriod = 60 * 60 * 1000; // 1 hour in milliseconds
const STORAGE_KEY = "focusTubeState";
const FOCUS_TIMER_ALARM = "focusTubeStateCheck";

function normalizeState(rawState = {}) {
  const state = {
    shortsBlockingEnabled: false,
    shortsTemporarilyDisabledUntil: null,
    blankPageEnabled: false,
    ...rawState,
  };

  if (!state.shortsTemporarilyDisabledUntil) {
    state.shortsTemporarilyDisabledUntil = null;
  }

  return state;
}

function readState(callback) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    callback(normalizeState(result[STORAGE_KEY] || {}));
  });
}

function persistState(state, callback = () => {}) {
  chrome.storage.local.set({ [STORAGE_KEY]: normalizeState(state) }, callback);
}

function ensureTemporaryDisableState(state) {
  const expiration = Number(state.shortsTemporarilyDisabledUntil || 0);

  if (expiration > 0 && expiration <= Date.now()) {
    return {
      ...state,
      shortsBlockingEnabled: true,
      shortsTemporarilyDisabledUntil: null,
    };
  }

  return state;
}

function isShortsBlockingActive(state) {
  const expiration = Number(state.shortsTemporarilyDisabledUntil || 0);

  if (expiration > 0 && expiration > Date.now()) {
    return false;
  }

  return Boolean(state.shortsBlockingEnabled);
}

function ensureFocusState() {
  readState((state) => {
    const nextState = ensureTemporaryDisableState(state);

    if (JSON.stringify(nextState) !== JSON.stringify(state)) {
      persistState(nextState);
    }
  });
}

function refreshAlarmState() {
  chrome.alarms.get(FOCUS_TIMER_ALARM, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(FOCUS_TIMER_ALARM, { periodInMinutes: 1 });
    }
  });
}

function handleYouTubeNavigation(details) {
  if (!details.url || !details.url.includes("://www.youtube.com/")) {
    return;
  }

  readState((state) => {
    const hydratedState = ensureTemporaryDisableState(state);

    if (details.url.includes("/shorts/") && isShortsBlockingActive(hydratedState)) {
      chrome.tabs.update(details.tabId, { url: "https://www.youtube.com/" });
      console.log("Shorts blocking is active; redirecting away from Shorts.");
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureFocusState();
  refreshAlarmState();
});

chrome.runtime.onStartup.addListener(() => {
  ensureFocusState();
  refreshAlarmState();
});

chrome.webNavigation.onCommitted.addListener(handleYouTubeNavigation, {
  url: [{ urlMatches: "https://www.youtube.com/*" }],
});

chrome.webNavigation.onHistoryStateUpdated.addListener(handleYouTubeNavigation, {
  url: [{ urlMatches: "https://www.youtube.com/*" }],
});

// Function to classify video content as educational or non-educational
async function classifyVideoContent(tabId) {
  const videoTitle = await getVideoTitle(tabId);
  const isEducational = educationalKeywords.some(keyword =>
    videoTitle.toLowerCase().includes(keyword)
  );

  if (!isEducational && !nonEducationalTimerStarted) {
    chrome.alarms.create("nonEducationalContentAlarm", { delayInMinutes: 1 });
    nonEducationalTimerStarted = true;
    console.log("Non-educational timer started.");
  }
}

// Retrieve video title from the current tab
async function getVideoTitle(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => document.title,
      },
      (results) => {
        if (results && results[0]) {
          resolve(results[0].result || "");
        } else {
          resolve("");
        }
      }
    );
  });
}

// Handle alarms for Shorts warnings, blocking, and non-educational content
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FOCUS_TIMER_ALARM) {
    ensureFocusState();
    return;
  }

  if (alarm.name === "notifyWarningAlarm") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Warning: Shorts will be blocked soon",
      message: "You've spent 1 minute on Shorts. Access will be blocked in 2 minutes."
    });
    chrome.alarms.create("blockShortsAlarm", { delayInMinutes: 1 });

  } else if (alarm.name === "blockShortsAlarm") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Shorts Blocked",
      message: "You've spent too much time on Shorts. Blocking access now."
    });

    readState((state) => {
      const nextState = ensureTemporaryDisableState({
        ...state,
        shortsBlockingEnabled: true,
        shortsTemporarilyDisabledUntil: null,
      });
      persistState(nextState);
    });

    chrome.tabs.query({ url: "*://www.youtube.com/shorts/*" }, function (tabs) {
      tabs.forEach(tab => {
        chrome.tabs.update(tab.id, { url: "https://www.youtube.com/" });
      });
    });

    chrome.storage.local.set({ shortsBlockTimestamp: Date.now() });
    timerStarted = false;
  } else if (alarm.name === "nonEducationalContentAlarm") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Focus Reminder",
      message: "You're watching non-educational content. Consider switching to educational videos to stay focused."
    });
    nonEducationalTimerStarted = false;
    console.log("Non-educational content notification sent.");
  }
});

// Reset alarms and timers when the user navigates away from Shorts or non-educational content
chrome.webNavigation.onCompleted.addListener((details) => {
  if (!details.url.includes("/shorts/")) {
    chrome.alarms.clear("notifyWarningAlarm");
    chrome.alarms.clear("blockShortsAlarm");
    chrome.alarms.clear("nonEducationalContentAlarm");
    timerStarted = false;
    nonEducationalTimerStarted = false;
    console.log("Shorts and focus alarms cleared and timers reset.");
  }
}, { url: [{ urlMatches: "https://www.youtube.com/*" }] });

refreshAlarmState();
