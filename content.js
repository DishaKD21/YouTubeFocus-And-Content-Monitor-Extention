const styleTag = document.createElement("style");
styleTag.id = "focusTubeStyles";
document.body.prepend(styleTag);

let observer = null;

function isExtensionContextValid() {
  return (
    typeof chrome !== "undefined" &&
    Boolean(chrome.runtime?.id) &&
    Boolean(chrome.storage?.local)
  );
}

function teardownStateSync() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (isExtensionContextValid()) {
    chrome.storage.local.onChanged.removeListener(handleStorageChange);
  }
}

function normalizeState(rawState = {}) {
  return {
    shortsBlockingEnabled: false,
    shortsTemporarilyDisabledUntil: null,
    blankPageEnabled: false,
    ...rawState,
  };
}

function isHomeFeedPage() {
  const { hostname, pathname } = window.location;
  return hostname === "www.youtube.com" && pathname === "/";
}

function applyFocusStyles(state) {
  const temporaryDisableUntil = Number(state.shortsTemporarilyDisabledUntil || 0);
  const isTemporarilyDisabled = temporaryDisableUntil > Date.now();
  const shouldBlockShorts = Boolean(state.shortsBlockingEnabled) && !isTemporarilyDisabled;
  const shouldHideHomeFeed = Boolean(state.blankPageEnabled) && isHomeFeedPage();

  document.body.setAttribute("data-focustube-shorts-blocked", shouldBlockShorts ? "true" : "false");
  document.body.setAttribute("data-focustube-blank-page", shouldHideHomeFeed ? "true" : "false");
  document.body.style.background = "";

  styleTag.textContent = `
    body[data-focustube-shorts-blocked="true"] ytd-mini-guide-entry-renderer[aria-label="Shorts"],
    body[data-focustube-shorts-blocked="true"] ytd-rich-section-renderer,
    body[data-focustube-shorts-blocked="true"] ytd-reel-shelf-renderer,
    body[data-focustube-shorts-blocked="true"] [title="Shorts"] {
      display: none !important;
    }

    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] #contents,
    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] ytd-rich-item-renderer,
    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] ytd-rich-section-renderer,
    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] ytd-reel-shelf-renderer {
      display: none !important;
    }
  `;
}

function syncExtensionState() {
  if (!isExtensionContextValid()) {
    teardownStateSync();
    return;
  }

  try {
    chrome.storage.local.get(["focusTubeState"], (result) => {
      const runtimeError = chrome.runtime?.lastError;

      if (runtimeError) {
        if (runtimeError.message?.includes("Extension context invalidated")) {
          teardownStateSync();
        }
        return;
      }

      const state = normalizeState(result.focusTubeState || {});
      applyFocusStyles(state);
    });
  } catch (error) {
    if (String(error).includes("Extension context invalidated")) {
      teardownStateSync();
      return;
    }

    throw error;
  }
}

function handleStorageChange(changes) {
  if (changes.focusTubeState) {
    syncExtensionState();
  }
}

if (isExtensionContextValid()) {
  chrome.storage.local.onChanged.addListener(handleStorageChange);
}

syncExtensionState();

// Use a MutationObserver to handle dynamic content/AJAX
observer = new MutationObserver(() => {
  syncExtensionState();
});

observer.observe(document.body, { childList: true, subtree: true });
