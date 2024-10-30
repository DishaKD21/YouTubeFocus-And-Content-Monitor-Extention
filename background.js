let timerStarted = false;

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
  if (details.url && details.url.includes("/shorts/")) {
    if (!timerStarted) {
      // Set an initial alarm for 1 minute for the first notification
      chrome.alarms.create("notifyWarningAlarm", { delayInMinutes: 1 });
      timerStarted = true;
    }
  }
}, { url: [{ urlMatches: "https://www.youtube.com/shorts/*" }] });

// Listen for alarms
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "notifyWarningAlarm") {
    // Notify the user that Shorts will be blocked in 2 minutes
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Warning: Shorts will be blocked soon",
      message: "You've spent 1 minute on Shorts. Access will be blocked in 2 minutes."
    });

    // Set another alarm for 2 minutes to block Shorts
    chrome.alarms.create("blockShortsAlarm", { delayInMinutes: 1 });
  } else if (alarm.name === "blockShortsAlarm") {
    // Notify the user that Shorts are now blocked
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Shorts Blocked",
      message: "You've spent too much time on Shorts. Blocking access now."
    });

    // Redirect to the YouTube homepage and stop Shorts
    chrome.tabs.query({ url: "*://www.youtube.com/shorts/*" }, function (tabs) {
      tabs.forEach(tab => {
        chrome.tabs.update(tab.id, { url: "https://www.youtube.com/" });
      });
    });

    timerStarted = false; // Reset timer for the next session
  }
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (!details.url.includes("/shorts/")) {
    // Clear alarms and reset the timer if the user navigates away from Shorts
    chrome.alarms.clearAll();
    timerStarted = false;
  }
}, { url: [{ urlMatches: "https://www.youtube.com/*" }] });
