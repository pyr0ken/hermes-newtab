/**
 * Hermes AI Agent - SidePanel UI & Controller
 * Connects DOM, OmniRoute SSE streams, active tabs, and user chat.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const chatFeed = document.getElementById('chat-feed');
  const messagesList = document.getElementById('messages-list');
  const emptyState = document.getElementById('empty-state');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send-message');
  const iconSend = document.getElementById('icon-send');
  const iconStop = document.getElementById('icon-stop');
  
  const activeTabDomain = document.getElementById('active-tab-domain');
  const activePageTitle = document.getElementById('active-page-title');
  const activePageFavicon = document.getElementById('active-page-favicon');
  const btnRefreshDom = document.getElementById('btn-refresh-dom');
  
  const btnToggleVision = document.getElementById('btn-toggle-vision');
  const visionIndicator = document.getElementById('vision-indicator');
  const btnAttachScreenshot = document.getElementById('btn-attach-screenshot');
  const attachmentPreviewBar = document.getElementById('attachment-preview-bar');
  const screenshotThumbnail = document.getElementById('screenshot-thumbnail');
  const btnRemoveAttachment = document.getElementById('btn-remove-attachment');
  
  const btnClearChat = document.getElementById('btn-clear-chat');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  
  const settingGatewayUrl = document.getElementById('setting-gateway-url');
  const settingApiKey = document.getElementById('setting-api-key');
  const settingModelName = document.getElementById('setting-model-name');
  const settingMaxSteps = document.getElementById('setting-max-steps');
  const settingAutoDom = document.getElementById('setting-auto-dom');
  const settingStream = document.getElementById('setting-stream');
  const currentModelDisplay = document.getElementById('current-model-display');

  // State
  let activeTab = null;
  let isGenerating = false;
  let pendingScreenshot = null;
  let visionModeAuto = false;
  let conversationHistory = []; // { role: 'user'|'assistant', content: '...' }

  // Default configuration
  let config = {
    baseUrl: 'http://127.0.0.1:20128/v1',
    apiKey: '',
    model: 'gemini-2.5-flash',
    maxSteps: 5,
    autoDom: true,
    stream: true
  };

  // 1. Load settings from storage
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage?.local?.get(['hermes_agent_config'], (res) => {
        if (res && res.hermes_agent_config) {
          config = { ...config, ...res.hermes_agent_config };
        }
        settingGatewayUrl.value = config.baseUrl;
        settingApiKey.value = config.apiKey || '';
        settingModelName.value = config.model;
        settingMaxSteps.value = config.maxSteps;
        settingAutoDom.checked = config.autoDom;
        settingStream.checked = config.stream !== false;
        currentModelDisplay.textContent = config.model;
        resolve(config);
      });
    });
  }

  await loadSettings();

  // Initialize Agent Engine
  let agentEngine = new HermesAgentEngine(config);

  // 2. Active Tab Detection & Tracking
  async function updateActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        activeTab = tab;
        const urlObj = tab.url ? new URL(tab.url) : null;
        const host = urlObj ? urlObj.hostname : 'Browser';
        
        activeTabDomain.textContent = host;
        activePageTitle.textContent = tab.title || host;

        if (tab.favIconUrl) {
          activePageFavicon.innerHTML = `<img src="${tab.favIconUrl}" style="width:14px;height:14px;border-radius:2px;" onerror="this.outerHTML='🌐'" />`;
        } else {
          activePageFavicon.textContent = '🌐';
        }
      }
    } catch (e) {
      console.warn('Could not query active tab:', e);
    }
  }

  await updateActiveTab();

  // Listen to tab events
  chrome.tabs?.onActivated?.addListener(() => updateActiveTab());
  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (activeTab && activeTab.id === tabId && changeInfo.status === 'complete') {
      updateActiveTab();
    }
  });

  // 3. Screenshot Capture Helper
  async function captureScreenshot() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (response) => {
        if (response && response.success && response.dataUrl) {
          resolve(response.dataUrl);
        } else {
          console.error('Screenshot capture failed:', response?.error);
          resolve(null);
        }
      });
    });
  }

  function setPendingScreenshot(dataUrl) {
    pendingScreenshot = dataUrl;
    if (dataUrl) {
      screenshotThumbnail.src = dataUrl;
      attachmentPreviewBar.style.display = 'block';
    } else {
      attachmentPreviewBar.style.display = 'none';
      screenshotThumbnail.src = '';
    }
  }

  btnAttachScreenshot.addEventListener('click', async () => {
    const dataUrl = await captureScreenshot();
    if (dataUrl) {
      setPendingScreenshot(dataUrl);
    }
  });

  btnRemoveAttachment.addEventListener('click', () => {
    setPendingScreenshot(null);
  });

  btnToggleVision.addEventListener('click', () => {
    visionModeAuto = !visionModeAuto;
    visionIndicator.classList.toggle('active', visionModeAuto);
    btnToggleVision.title = visionModeAuto ? 'Vision Mode Active (Will snap tab on questions)' : 'Toggle Tab Screenshot Context';
  });

  // 4. Quick Actions Carousel
  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const action = chip.getAttribute('data-action');
      if (action === 'summarize') {
        runPrompt('لطفاً محتوای این صفحه رو به صورت دقیق، ساختاریافته و با بولتپوینتهای کلیدی به فارسی خلاصه کن.');
      } else if (action === 'inspect-elements') {
        runPrompt('فرمها، فیلدهای ورودی و دکمههای اصلی این صفحه رو پیدا کن و قابلیت هر کدوم رو توضیح بده.');
      } else if (action === 'find-actions') {
        runPrompt('چه عملیات و کارهایی در این صفحه قابل انجام است؟ گزینهها و لینکهای اصلی رو لیست کن.');
      } else if (action === 'snap-vision') {
        const snap = await captureScreenshot();
        setPendingScreenshot(snap);
        runPrompt('تصویر و ساختار بصری این صفحه رو تحلیل کن و اجزای مهم رو توضیح بده.');
      }
    });
  });

  // Empty state prompt suggestion pills
  document.querySelectorAll('.prompt-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const promptText = pill.getAttribute('data-prompt');
      if (promptText) {
        runPrompt(promptText);
      }
    });
  });

  btnRefreshDom.addEventListener('click', async () => {
    btnRefreshDom.style.transform = 'rotate(360deg)';
    btnRefreshDom.style.transition = 'transform 0.5s ease';
    await updateActiveTab();
    setTimeout(() => {
      btnRefreshDom.style.transform = '';
      btnRefreshDom.style.transition = '';
    }, 500);
  });

  // 5. Input Auto-Resize & Event Listeners
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  btnSend.addEventListener('click', () => {
    if (isGenerating) {
      agentEngine.abort();
      setGeneratingState(false);
    } else {
      handleSend();
    }
  });

  function setGeneratingState(generating) {
    isGenerating = generating;
    if (generating) {
      iconSend.style.display = 'none';
      iconStop.style.display = 'block';
      btnSend.style.background = '#ef4444';
      btnSend.title = 'Stop generating';
    } else {
      iconSend.style.display = 'block';
      iconStop.style.display = 'none';
      btnSend.style.background = 'var(--sidepanel-accent)';
      btnSend.title = 'Send (Enter)';
    }
  }

  // 6. Markdown Formatter Utility
  function renderMarkdown(md) {
    if (!md) return '';
    let html = md
      // Escape HTML tags to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced Code Blocks
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Links [title](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;">$1</a>');

    // Bold and Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered Lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Paragraphs / Newlines
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // 7. Message Appender
  function appendMessage(role, text = '', imageThumbnail = null) {
    emptyState.style.display = 'none';

    const item = document.createElement('div');
    item.className = `message-item ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (imageThumbnail) {
      const img = document.createElement('img');
      img.src = imageThumbnail;
      img.style.cssText = 'max-width: 100%; border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.15);';
      bubble.appendChild(img);
    }

    const contentSpan = document.createElement('div');
    contentSpan.className = 'message-text-content';
    contentSpan.innerHTML = role === 'assistant' ? renderMarkdown(text) : text.replace(/\n/g, '<br>');
    bubble.appendChild(contentSpan);

    item.appendChild(bubble);
    messagesList.appendChild(item);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    return { item, bubble, contentSpan };
  }

  // Tool execution step card in chat
  function appendToolCard(parentBubble, toolName, args) {
    const card = document.createElement('div');
    card.className = 'tool-step-card';

    let icon = '⚡';
    if (toolName === 'click_element') icon = '🖱';
    if (toolName === 'type_text') icon = '⌨';
    if (toolName === 'select_dropdown') icon = '▾';
    if (toolName === 'hover_element') icon = '👆';
    if (toolName === 'press_key') icon = '⌨';
    if (toolName === 'capture_screenshot') icon = '📸';
    if (toolName === 'scroll_page') icon = '📜';
    if (toolName === 'extract_page_content') icon = '📄';
    if (toolName === 'navigate_to') icon = '🌐';
    if (toolName === 'go_back') icon = '⬅';
    if (toolName === 'go_forward') icon = '➡';
    if (toolName === 'reload_page') icon = '🔄';
    if (toolName === 'wait_for_element') icon = '⏳';
    if (toolName === 'sleep') icon = '💤';
    if (toolName === 'execute_javascript') icon = '⚙';
    if (toolName === 'highlight_element') icon = '🎯';

    card.innerHTML = `
      <div class="tool-step-header">
        <span>${icon} Tool: <code>${toolName}</code></span>
        <span class="tool-step-status running">● Running...</span>
      </div>
      <div class="tool-step-body">${JSON.stringify(args, null, 2)}</div>
    `;

    parentBubble.appendChild(card);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    return {
      finish: (result) => {
        const statusEl = card.querySelector('.tool-step-status');
        if (statusEl) {
          statusEl.className = 'tool-step-status done';
          statusEl.textContent = '✔ Done';
        }
        const bodyEl = card.querySelector('.tool-step-body');
        if (bodyEl && result) {
          bodyEl.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        }
      }
    };
  }

  // 8. Main Send & Execution Flow
  async function runPrompt(text) {
    if (!text || !text.trim() || isGenerating) return;

    await updateActiveTab();
    const tabId = activeTab?.id;

    let screenshotToUse = pendingScreenshot;
    if (!screenshotToUse && visionModeAuto) {
      screenshotToUse = await captureScreenshot();
    }

    // Append user message
    appendMessage('user', text, screenshotToUse);
    conversationHistory.push({ role: 'user', content: text });

    // Clear input & pending attachments
    chatInput.value = '';
    chatInput.style.height = 'auto';
    setPendingScreenshot(null);

    // Create assistant message container for streaming
    const assistantUI = appendMessage('assistant', '');
    setGeneratingState(true);

    let streamBuffer = '';
    let currentToolCard = null;

    try {
      const finalResponse = await agentEngine.runAgentLoop({
        tabId,
        userPrompt: text,
        screenshotDataUrl: screenshotToUse,
        history: conversationHistory.slice(-6), // Send recent turns for context
        onToken: (chunk) => {
          streamBuffer += chunk;
          assistantUI.contentSpan.innerHTML = renderMarkdown(streamBuffer);
          chatFeed.scrollTop = chatFeed.scrollHeight;
        },
        onToolStart: (toolName, args) => {
          currentToolCard = appendToolCard(assistantUI.bubble, toolName, args);
        },
        onToolEnd: (toolName, result) => {
          if (currentToolCard) {
            currentToolCard.finish(result);
            currentToolCard = null;
          }
        },
        onStatus: (statusText) => {
          if (statusText && !streamBuffer) {
            assistantUI.contentSpan.innerHTML = `<span style="color: var(--sidepanel-text-muted); font-size:11.5px;">✦ ${statusText}</span>`;
          }
        }
      });

      if (finalResponse) {
        conversationHistory.push({ role: 'assistant', content: finalResponse });
        assistantUI.contentSpan.innerHTML = renderMarkdown(finalResponse);
      } else if (streamBuffer) {
        conversationHistory.push({ role: 'assistant', content: streamBuffer });
      }
    } catch (err) {
      console.error('Agent execution error:', err);
      assistantUI.contentSpan.innerHTML += `<div style="color: #ef4444; margin-top: 8px; font-size: 11px;">⚠️ خطا در ارتباط با Gateway: ${err.message}</div>`;
    } finally {
      setGeneratingState(false);
    }
  }

  function handleSend() {
    const text = chatInput.value.trim();
    if (text) {
      runPrompt(text);
    }
  }

  // 9. Clear Chat
  btnClearChat.addEventListener('click', () => {
    messagesList.innerHTML = '';
    conversationHistory = [];
    emptyState.style.display = 'flex';
  });

  // 10. Settings Modal Handling
  btnOpenSettings.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  btnSaveSettings.addEventListener('click', () => {
    config.baseUrl = settingGatewayUrl.value.trim() || 'http://127.0.0.1:20128/v1';
    config.apiKey = settingApiKey.value.trim();
    config.model = settingModelName.value.trim() || 'gemini-2.5-flash';
    config.maxSteps = parseInt(settingMaxSteps.value, 10) || 5;
    config.autoDom = settingAutoDom.checked;
    config.stream = settingStream.checked;

    chrome.storage?.local?.set({ hermes_agent_config: config }, () => {
      agentEngine = new HermesAgentEngine(config);
      currentModelDisplay.textContent = config.model;
      settingsModal.style.display = 'none';
    });
  });
});
