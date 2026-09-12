/**
 * Hermes AI Agent - Background Service Worker (Manifest V3)
 * Handles side panel lifecycle, tab capture, and inter-context message routing.
 */

// 1. Configure default side panel behavior to open when action icon is clicked
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn('[Hermes Background] setPanelBehavior warning:', err));

// 2. Direct action click handler fallback
chrome.action?.onClicked?.addListener(async (tab) => {
  try {
    if (tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    console.warn('[Hermes Background] action.onClicked sidePanel.open:', err);
  }
});

// 3. Global keyboard command shortcuts listener
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'open_side_panel' || command === '_execute_action') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch (err) {
      console.warn('[Hermes Background] commands.onCommand sidePanel.open:', err);
    }
  }
});

// 4. Global message hub for asynchronous tab operations
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // A. Explicit request to open side panel
  if (message.type === 'OPEN_SIDEPANEL') {
    (async () => {
      try {
        let windowId = message.windowId || sender?.tab?.windowId;
        if (!windowId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          windowId = tab?.windowId;
        }
        if (windowId) {
          await chrome.sidePanel.open({ windowId });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No active window found' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // B. Capture current visible tab as a high-quality data URL (PNG)
  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    const windowId = message.windowId || sender?.tab?.windowId || undefined;
    chrome.tabs.captureVisibleTab(
      windowId,
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('[Hermes Background] Capture error:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, dataUrl });
        }
      }
    );
    return true;
  }

  // C. Query active tab info
  if (message.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else if (tabs && tabs[0]) {
        sendResponse({ success: true, tab: tabs[0] });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }

  // D. Inject content script dynamically if not already injected
  if (message.type === 'ENSURE_CONTENT_SCRIPT') {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'Missing tabId' });
      return false;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['js/content-script.js']
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // E. Tab Navigation & History Actions
  if (message.type === 'TAB_GO_BACK') {
    const tabId = message.tabId;
    if (tabId) {
      chrome.tabs.goBack(tabId, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Missing tabId' });
    }
    return true;
  }

  if (message.type === 'TAB_GO_FORWARD') {
    const tabId = message.tabId;
    if (tabId) {
      chrome.tabs.goForward(tabId, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Missing tabId' });
    }
    return true;
  }

  if (message.type === 'TAB_RELOAD') {
    const tabId = message.tabId;
    if (tabId) {
      chrome.tabs.reload(tabId, { bypassCache: !!message.bypassCache }, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Missing tabId' });
    }
    return true;
  }
});
