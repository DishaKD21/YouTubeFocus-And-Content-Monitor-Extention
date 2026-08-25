const STORAGE_KEY = "focusTubeState";

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

function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(normalizeState(result[STORAGE_KEY] || {}));
    });
  });
}

function saveState(state) {
  chrome.storage.local.set({ [STORAGE_KEY]: normalizeState(state) });
}

function formatRemainingTime(timestamp) {
  const remainingMs = Math.max(timestamp - Date.now(), 0);
  const minutes = Math.floor(remainingMs / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }

  return `${Math.max(seconds, 1)}s remaining`;
}

function renderState(state) {
  const blankToggle = document.getElementById("blankToggle");
  const blankStatus = document.getElementById("blankStatus");
  const shortsToggle = document.getElementById("shortsToggle");
  const shortsStatus = document.getElementById("shortsStatus");

  blankToggle.classList.toggle("on", Boolean(state.blankPageEnabled));
  blankToggle.textContent = state.blankPageEnabled ? "ON" : "OFF";
  blankToggle.setAttribute("aria-pressed", String(Boolean(state.blankPageEnabled)));
  blankStatus.textContent = state.blankPageEnabled
    ? "Blank Page is currently ON."
    : "Blank Page is currently OFF.";

  shortsToggle.classList.toggle("on", Boolean(state.shortsBlockingEnabled));
  shortsToggle.textContent = state.shortsBlockingEnabled ? "ON" : "OFF";
  shortsToggle.setAttribute("aria-pressed", String(Boolean(state.shortsBlockingEnabled)));

  if (state.shortsBlockingEnabled) {
    shortsStatus.textContent = "Shorts Blocking is currently active.";
  } else if (state.shortsTemporarilyDisabledUntil) {
    const remaining = Number(state.shortsTemporarilyDisabledUntil);

    if (remaining <= Date.now()) {
      shortsStatus.textContent = "Shorts Blocking is active again.";
    } else {
      const durationMs = remaining - Date.now();
      const durationLabel = durationMs <= 60 * 60 * 1000 ? "5 minutes" : "1 hour";
      shortsStatus.textContent = `Shorts unblocked for ${durationLabel}. ${formatRemainingTime(remaining)}`;
    }
  } else {
    shortsStatus.textContent = "Shorts Blocking is currently OFF.";
  }
}

async function syncStateFromStorage() {
  const state = await getState();
  const expiry = Number(state.shortsTemporarilyDisabledUntil || 0);

  if (expiry > 0 && expiry <= Date.now()) {
    state.shortsBlockingEnabled = true;
    state.shortsTemporarilyDisabledUntil = null;
    saveState(state);
  }

  renderState(state);
}

function toggleBlankPage() {
  getState().then((state) => {
    const nextState = {
      ...state,
      blankPageEnabled: !state.blankPageEnabled,
    };
    saveState(nextState);
    renderState(nextState);
  });
}

function toggleShortsBlocking() {
  getState().then((state) => {
    if (state.shortsBlockingEnabled) {
      const modal = document.getElementById("durationModal");
      modal.classList.add("visible");
      modal.setAttribute("aria-hidden", "false");
      return;
    }

    const nextState = {
      ...state,
      shortsBlockingEnabled: true,
      shortsTemporarilyDisabledUntil: null,
    };
    saveState(nextState);
    renderState(nextState);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("blankToggle").addEventListener("click", toggleBlankPage);
  document.getElementById("shortsToggle").addEventListener("click", toggleShortsBlocking);

  document.querySelectorAll(".duration-option").forEach((button) => {
    button.addEventListener("click", async () => {
      const state = await getState();
      const duration = button.getAttribute("data-duration");

      if (duration === "manual") {
        const nextState = {
          ...state,
          shortsBlockingEnabled: false,
          shortsTemporarilyDisabledUntil: null,
        };
        saveState(nextState);
        renderState(nextState);
      } else {
        const expiry = Date.now() + Number(duration);
        const nextState = {
          ...state,
          shortsBlockingEnabled: false,
          shortsTemporarilyDisabledUntil: expiry,
        };
        saveState(nextState);
        renderState(nextState);
      }

      const modal = document.getElementById("durationModal");
      modal.classList.remove("visible");
      modal.setAttribute("aria-hidden", "true");
    });
  });

  document.getElementById("cancelDuration").addEventListener("click", () => {
    const modal = document.getElementById("durationModal");
    modal.classList.remove("visible");
    modal.setAttribute("aria-hidden", "true");
  });

  syncStateFromStorage();
  setInterval(syncStateFromStorage, 15000);
});
