let timerStarted = false;
let nonEducationalTimerStarted = false;
const educationalKeywords = ["tutorial", "lecture", "lesson", "course", "how to", "education"];
const cooldownPeriod = 60 * 60 * 1000; // 1 hour in milliseconds

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.url.includes("/shorts/")) {
    const currentTime = Date.now();

    // Check if cooldown period is active
    chrome.storage.local.get("shortsBlockTimestamp", (data) => {
      const lastBlockTime = data.shortsBlockTimestamp || 0;
      if (currentTime - lastBlockTime < cooldownPeriod) {
        // Cooldown active: redirect Shorts immediately
        chrome.tabs.update(details.tabId, { url: "https://www.youtube.com/" });
        console.log("Shorts are still blocked due to cooldown.");
      } else if (!timerStarted) {
        // Start timer if cooldown is over
        chrome.alarms.create("notifyWarningAlarm", { delayInMinutes: 1 });
        timerStarted = true;
        console.log("Shorts timer started.");
      }
    });
  } else if (details.url.includes("/watch")) {
    // Classify video content if on a standard YouTube video
    const tabId = details.tabId;
    classifyVideoContent(tabId);
  }
}, { url: [{ urlMatches: "https://www.youtube.com/*" }] });

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
  if (alarm.name === "notifyWarningAlarm") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Warning: Shorts will be blocked soon",
      message: "You've spent 1 minute on Shorts. Access will be blocked in 2 minutes."
    });
    chrome.alarms.create("blockShortsAlarm", { delayInMinutes: 1});

  } else if (alarm.name === "blockShortsAlarm") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Shorts Blocked",
      message: "You've spent too much time on Shorts. Blocking access now."
    });
    chrome.tabs.query({ url: "*://www.youtube.com/shorts/*" }, function (tabs) {
      tabs.forEach(tab => {
        chrome.tabs.update(tab.id, { url: "https://www.youtube.com/" });
      });
    });

    // Store the current timestamp to enforce cooldown
    chrome.storage.local.set({ shortsBlockTimestamp: Date.now() });

    timerStarted = false; // Reset timer for next session
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
    chrome.alarms.clearAll();
    timerStarted = false;
    nonEducationalTimerStarted = false;
    console.log("All alarms cleared and timers reset.");
  }
}, { url: [{ urlMatches: "https://www.youtube.com/*" }] });
