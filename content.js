const styleTag = document.createElement("style");
styleTag.id = "focusTubeStyles";
document.body.prepend(styleTag);

function normalizeState(rawState = {}) {
  return {
    shortsBlockingEnabled: false,
    shortsTemporarilyDisabledUntil: null,
    blankPageEnabled: false,
    ...rawState,
  };
}

function applyFocusStyles(state) {
  const temporaryDisableUntil = Number(state.shortsTemporarilyDisabledUntil || 0);
  const isTemporarilyDisabled = temporaryDisableUntil > Date.now();
  const shouldBlockShorts = Boolean(state.shortsBlockingEnabled) && !isTemporarilyDisabled;
  const blankPageOn = Boolean(state.blankPageEnabled);

  document.body.setAttribute("data-focustube-shorts-blocked", shouldBlockShorts ? "true" : "false");
  document.body.setAttribute("data-focustube-blank-page", blankPageOn ? "true" : "false");
  document.body.style.background = blankPageOn ? "#fff" : "";

  styleTag.textContent = `
    body[data-focustube-shorts-blocked="true"] ytd-mini-guide-entry-renderer[aria-label="Shorts"],
    body[data-focustube-shorts-blocked="true"] ytd-rich-section-renderer,
    body[data-focustube-shorts-blocked="true"] ytd-reel-shelf-renderer,
    body[data-focustube-shorts-blocked="true"] [title="Shorts"] {
      display: none !important;
    }

    body[data-focustube-blank-page="true"] ytd-rich-grid-renderer,
    body[data-focustube-blank-page="true"] ytd-section-list-renderer,
    body[data-focustube-blank-page="true"] ytd-browse[page-subtype="home"] #contents,
    body[data-focustube-blank-page="true"] ytd-rich-item-renderer,
    body[data-focustube-blank-page="true"] ytd-video-renderer,
    body[data-focustube-blank-page="true"] ytd-shelf-renderer,
    body[data-focustube-blank-page="true"] ytd-compact-video-renderer {
      display: none !important;
    }
  `;
}

function syncExtensionState() {
  chrome.storage.local.get(["focusTubeState"], (result) => {
    const state = normalizeState(result.focusTubeState || {});
    applyFocusStyles(state);
  });
}

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.focusTubeState) {
    syncExtensionState();
  }
});

syncExtensionState();

// Use a MutationObserver to handle dynamic content/AJAX
const observer = new MutationObserver(() => {
  syncExtensionState();
});

observer.observe(document.body, { childList: true, subtree: true });

function addPieChartButton() {
  if (document.querySelector("#pieChartButton")) return;

  const header = document.querySelector("#container.ytd-masthead");
  if (header) {
    const button = document.createElement("button");
    button.id = "pieChartButton";
    button.textContent = "View Pie Chart";
    button.style.cssText = `
      background-color: #cc0000;
      color: white;
      border: none;
      padding: 10px 15px;
      font-size: 14px;
      cursor: pointer;
      border-radius: 5px;
      margin-left: 10px;
    `;
    header.appendChild(button);
    button.addEventListener("click", () => {
      alert("Pie chart will be displayed here!");
    });
  }
}

addPieChartButton();
