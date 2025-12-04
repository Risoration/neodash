# NeoDash Focus Mode Browser Extension

This browser extension blocks distracting websites during focus mode sessions managed in NeoDash.

## Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project

## Setup

1. Go to NeoDash Settings → Focus & Blocking
2. Generate an API key if you haven't already
3. Click the extension icon in your browser
4. Paste the API key and click "Save API Key"

## How It Works

- The extension syncs with NeoDash every 5 seconds
- When focus mode is active (and you're not on break), it blocks all sites in your blacklist
- Blocked sites redirect to a "Site Blocked" page
- During breaks, all sites are accessible again

## Development

To modify the extension:

1. Update `background.js` for sync logic and blocking rules
2. Update `popup.html` and `popup.js` for the popup UI
3. Update `blocked.html` for the blocked page
4. After changes, go to `chrome://extensions/` and click the refresh icon on the extension card

## Notes

- **Important**: Change `API_BASE_URL` in `background.js` to your production URL before deploying
- The extension uses Manifest V3 (Chrome/Edge)
- **Icon Files Required**: You need to add icon files (icon16.png, icon48.png, icon128.png) to the extension folder. You can:
  - Create simple icons using any image editor
  - Use online icon generators
  - Use placeholder images for development
  - The icons should represent a lock or focus symbol

## Troubleshooting

- If sites aren't being blocked, check that:
  1. Your API key is correctly entered in the extension popup
  2. Focus mode is active in NeoDash (not on break)
  3. The sites are added to your blocked list in Settings
  4. The extension has the necessary permissions (check chrome://extensions/)
  
- If the extension shows "Not connected":
  1. Verify your API key is correct
  2. Check that NeoDash is running and accessible
  3. Make sure the API_BASE_URL in background.js matches your NeoDash URL

