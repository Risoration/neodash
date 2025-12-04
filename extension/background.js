// NeoDash Focus Mode Extension - Background Script

// API Base URL - update this to your production URL
// For development: 'http://localhost:3000'
// For production: 'https://your-domain.com'
const API_BASE_URL = 'http://localhost:3000';
const SYNC_INTERVAL = 5000; // Sync every 5 seconds
let syncInterval = null;
let currentState = {
  isFocusing: false,
  isOnBreak: false,
  blockedSites: [],
  apiKey: null,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('NeoDash Focus Mode extension installed');
  loadState();
});

// Load state from storage
async function loadState() {
  const result = await chrome.storage.local.get(['apiKey', 'state']);
  if (result.apiKey) {
    currentState.apiKey = result.apiKey;
    syncWithNeoDash();
  }
  if (result.state) {
    currentState = { ...currentState, ...result.state };
    updateBlockingRules();
  }
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set({
    state: {
      isFocusing: currentState.isFocusing,
      isOnBreak: currentState.isOnBreak,
      blockedSites: currentState.blockedSites,
    },
  });
}

// Sync with NeoDash API
async function syncWithNeoDash() {
  if (!currentState.apiKey) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/productivity/focus/session`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: currentState.apiKey }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Invalid API key');
        currentState.apiKey = null;
        await chrome.storage.local.remove(['apiKey']);
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const wasFocusing = currentState.isFocusing;
    
    currentState.isFocusing = data.isFocusing;
    currentState.isOnBreak = data.isOnBreak;
    currentState.blockedSites = data.blockedSites || [];
    currentState.breakEndsAt = data.breakEndsAt;

    // Update blocking rules if focus state changed
    if (wasFocusing !== currentState.isFocusing || currentState.isOnBreak) {
      updateBlockingRules();
      await saveState();
    }
  } catch (error) {
    console.error('Error syncing with NeoDash:', error);
  }
}

// Update declarativeNetRequest rules to block sites
async function updateBlockingRules() {
  // Remove existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  if (existingRules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map((r) => r.id),
    });
  }

  // Only block if focusing and not on break
  if (!currentState.isFocusing || currentState.isOnBreak) {
    return;
  }

  // Create blocking rules for each blocked site
  const rules = currentState.blockedSites.map((site, index) => {
    // Normalize site (remove protocol, www, etc.)
    const domain = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    return {
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          extensionPath: '/blocked.html',
        },
      },
      condition: {
        urlFilter: `*://${domain}/*`,
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    };
  });

  if (rules.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
      });
      console.log(`Blocking ${rules.length} sites`);
    } catch (error) {
      console.error('Error updating blocking rules:', error);
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setApiKey') {
    currentState.apiKey = request.apiKey;
    chrome.storage.local.set({ apiKey: request.apiKey });
    syncWithNeoDash();
    sendResponse({ success: true });
  } else if (request.action === 'getState') {
    sendResponse(currentState);
  } else if (request.action === 'sync') {
    syncWithNeoDash().then(() => sendResponse(currentState));
    return true; // Keep channel open for async response
  }
});

// Start periodic sync
if (!syncInterval) {
  syncInterval = setInterval(syncWithNeoDash, SYNC_INTERVAL);
}

// Sync immediately on startup
syncWithNeoDash();

