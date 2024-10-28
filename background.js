let timerStarted = false;

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
  if (details.url && details.url.includes("/shorts/")) {
    if (!timerStarted) {
      // Set an alarm for 5 minutes (300 seconds)
      chrome.alarms.create("blockShortsAlarm", { delayInMinutes: 1 });
      timerStarted = true;
    }
  }
}, { url: [{ urlMatches: "https://www.youtube.com/shorts/*" }] });

// Listen for the alarm to trigger after 1 minutes
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "blockShortsAlarm") {
    // Notify the user that Shorts will be blocked
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/shorts-remove-icon48.png",
      title: "Shorts Blocked",
      message: "You've spent 1 minutes on Shorts. We're now blocking access."
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
    chrome.alarms.clear("blockShortsAlarm");
    timerStarted = false;
  }
}, { url: [{ urlMatches: "https://www.youtube.com/*" }] });
