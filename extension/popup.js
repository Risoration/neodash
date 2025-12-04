// NeoDash Focus Mode Extension - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const apiKeySection = document.getElementById('apiKeySection');
  const connectedSection = document.getElementById('connectedSection');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKey');
  const syncBtn = document.getElementById('syncBtn');
  const sitesInfo = document.getElementById('sitesInfo');

  // Load current state
  const result = await chrome.storage.local.get(['apiKey']);
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
    showConnected();
  }

  // Request current state from background
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    updateStatus(state);
  });

  // Save API key
  saveKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    chrome.runtime.sendMessage(
      { action: 'setApiKey', apiKey },
      (response) => {
        if (response && response.success) {
          showConnected();
          chrome.runtime.sendMessage({ action: 'sync' }, (state) => {
            updateStatus(state);
          });
        }
      }
    );
  });

  // Sync button
  syncBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sync' }, (state) => {
      updateStatus(state);
    });
  });

  function showConnected() {
    apiKeySection.style.display = 'none';
    connectedSection.style.display = 'block';
  }

  function updateStatus(state) {
    if (!state) {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Not connected';
      return;
    }

    if (state.isFocusing && !state.isOnBreak) {
      statusDiv.className = 'status active';
      statusDiv.textContent = '🔒 Focus Mode Active';
      sitesInfo.textContent = `Blocking ${state.blockedSites?.length || 0} sites`;
    } else if (state.isOnBreak) {
      statusDiv.className = 'status break';
      statusDiv.textContent = '☕ On Break';
      sitesInfo.textContent = 'Sites are unblocked during break';
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Focus mode not active';
      sitesInfo.textContent = `Ready to block ${state.blockedSites?.length || 0} sites`;
    }
  }
});

