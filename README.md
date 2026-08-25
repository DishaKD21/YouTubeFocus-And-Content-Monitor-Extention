# FocusTube - YouTube Focus and Content Monitor Extension

A Chrome extension that helps reduce distraction on YouTube.

## Features

- Blank Page Mode (Home-only): hides the YouTube Home feed so recommendations do not distract you.
- Shorts Blocking: blocks access to YouTube Shorts.
- Temporary Shorts disable options:
  - 5 Minutes
  - 1 Hour
  - Until manually enabled again
- Persistent state: your toggle choices are saved.

## Project Files

- `manifest.json`: Extension manifest (MV3)
- `background.js`: state, alarms, and navigation handling
- `content.js`: page-level YouTube UI control
- `popup.html` + `popup.js`: popup UI and behavior
- `images/`: extension icons

## How to Add This Extension in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn ON `Developer mode` (top-right corner).
3. Click `Load unpacked`.
4. Select this project folder:
   - `YouTubeFocus-And-Content-Monitor-Extention`
5. The extension should now appear in your extensions list.
6. (Optional) Click the puzzle icon in Chrome toolbar and pin this extension for quick access.

## How to Use

1. Open YouTube in Chrome.
2. Click the extension icon to open the popup.
3. Use `Blank Page` toggle:
   - ON: hides content on YouTube Home page only (`https://www.youtube.com/`).
   - Search and watch pages continue to work normally.
4. Use `Shorts Blocking` toggle:
   - ON: blocks Shorts pages.
   - OFF: asks how long to disable blocking.
5. Choose a disable duration when prompted:
   - `5 Minutes`
   - `1 Hour`
   - `Until Manually Enabled`

## Recommended Test Flow

1. Enable `Blank Page` and go to YouTube Home page.
2. Confirm home feed is hidden.
3. Search for any video and confirm results are visible.
4. Open a normal watch page and confirm videos play as expected.
5. Enable `Shorts Blocking` and open a Shorts URL to confirm redirect/block behavior.

## If Changes Do Not Reflect

1. Go to `chrome://extensions`.
2. Click `Reload` on this extension card.
3. Refresh open YouTube tabs.

Note: If you reload the extension while old YouTube tabs are open, you may see temporary `Extension context invalidated` errors in old tab consoles. Refreshing those tabs loads the new script context.

## Permissions Used (Summary)

- `storage`: saves your extension settings
- `webNavigation`: reacts to YouTube SPA navigation
- `tabs` and `scripting`: updates tabs and reads tab details when needed
- `alarms` and `notifications`: timer-based reminders and blocking flow

## Development Notes

- Manifest version: MV3
- Background script uses `service_worker`
- Designed for YouTube pages under `https://www.youtube.com/*`
