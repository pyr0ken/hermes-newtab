/**
 * Hermes AI Agent - Advanced ReAct & OmniRoute Multi-Modal Engine
 * Comprehensive tool suite: Deep Frames, Dynamic In-Loop Vision/Screenshots,
 * Keyboard Simulation, Dropdown Selection, JS Execution, and Navigation History.
 */

class HermesAgentEngine {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:20128/v1';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gemini-2.5-flash';
    this.maxSteps = config.maxSteps || 6;
    this.autoDom = config.autoDom !== false;
    this.abortController = null;

    // Full 16-tool standard JSON Schema
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'click_element',
          description: 'Clicks an interactive element, link, button, tree node, or menu item by its [#ID], visible text, or CSS selector.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'The numerical ID of the element (from interactive tree)' },
              text: { type: 'string', description: 'Visible text of the link, button, menu item, or table cell to click (e.g. "اطلاعات جامع دانشجو", "آموزش", "ورود")' },
              selector: { type: 'string', description: 'Optional CSS selector' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'type_text',
          description: 'Types text into an input field, search box, or textarea across all frames.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'The numerical ID of the input element' },
              text: { type: 'string', description: 'The text to type into the field' },
              clear_first: { type: 'boolean', description: 'Whether to clear existing text first (default true)' },
              press_enter: { type: 'boolean', description: 'Whether to simulate pressing Enter key after typing (default false)' }
            },
            required: ['id', 'text']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'select_dropdown',
          description: 'Selects an option in a <select> dropdown by option text or value.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'The numerical ID of the <select> element' },
              text: { type: 'string', description: 'Visible label/text of the option to select' },
              value: { type: 'string', description: 'Value attribute of the option' }
            },
            required: ['id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'hover_element',
          description: 'Hovers over an element to trigger dropdown menus, expanding sub-menus (e.g. in Golestan: hover on "آموزش", then hover on "دانشجو"), tooltips, or hover states.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'The numerical ID of the element to hover over' },
              text: { type: 'string', description: 'Visible text of the menu item to hover on (e.g. "آموزش", "دانشجو")' },
              selector: { type: 'string', description: 'Optional CSS selector' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'press_key',
          description: 'Dispatches key presses like Enter, Escape, Tab, Backspace, or Arrow keys to the active/focused element.',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key name (e.g. Enter, Escape, Tab, ArrowDown, ArrowUp, Space, Backspace)' },
              id: { type: 'number', description: 'Optional element ID to focus before pressing key' },
              ctrl: { type: 'boolean', description: 'Hold Ctrl key' },
              shift: { type: 'boolean', description: 'Hold Shift key' },
              alt: { type: 'boolean', description: 'Hold Alt key' }
            },
            required: ['key']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'capture_screenshot',
          description: 'Takes a live high-resolution screenshot of the current active browser tab to visually inspect CAPTCHAs, charts, visual layout, or errors.',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Brief description of what you need to visually check (e.g. solve captcha, verify layout)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'scroll_page',
          description: 'Scrolls the page viewport.',
          parameters: {
            type: 'object',
            properties: {
              direction: { type: 'string', enum: ['down', 'up', 'top', 'bottom'], description: 'Scroll direction' },
              amount: { type: 'number', description: 'Pixel amount to scroll (default 450)' }
            },
            required: ['direction']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'extract_page_content',
          description: 'Extracts full clean text and structured Markdown content across all frames of the current web page.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'navigate_to',
          description: 'Navigates the browser tab to a specified URL.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The full URL to navigate to (e.g. https://...)' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'go_back',
          description: 'Navigates back one step in browser history.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'go_forward',
          description: 'Navigates forward one step in browser history.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reload_page',
          description: 'Reloads the current active tab.',
          parameters: {
            type: 'object',
            properties: {
              bypass_cache: { type: 'boolean', description: 'Whether to hard-reload ignoring cache' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'wait_for_element',
          description: 'Waits until a specific element selector or text appears in the page or any nested frame.',
          parameters: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to wait for' },
              text: { type: 'string', description: 'Text snippet to wait for' },
              timeout_ms: { type: 'number', description: 'Max wait time in milliseconds (default 5000)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'sleep',
          description: 'Pauses execution for a specified number of seconds to allow AJAX requests, animations, or redirects to complete.',
          parameters: {
            type: 'object',
            properties: {
              seconds: { type: 'number', description: 'Seconds to wait (1 to 10)' }
            },
            required: ['seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'execute_javascript',
          description: 'Executes custom JavaScript directly in the active webpage context and returns the result.',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'JavaScript code string to evaluate' }
            },
            required: ['code']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'highlight_element',
          description: 'Temporarily highlights an element on the user screen with a glowing neon box and label badge.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'The ID of the element to highlight' },
              label: { type: 'string', description: 'Short badge label to show above the element' }
            },
            required: ['id']
          }
        }
      }
    ];
  }

  /**
   * Resilient tool name normalization
   */
  normalizeToolName(name) {
    if (!name) return '';
    const clean = name.trim().toLowerCase();
    if (clean.includes('navigate')) return 'navigate_to';
    if (clean.includes('screenshot') || clean.includes('capture')) return 'capture_screenshot';
    if (clean.includes('click')) return 'click_element';
    if (clean.includes('type')) return 'type_text';
    if (clean.includes('dropdown') || clean.includes('select')) return 'select_dropdown';
    if (clean.includes('hover')) return 'hover_element';
    if (clean.includes('press') || clean.includes('key')) return 'press_key';
    if (clean.includes('scroll')) return 'scroll_page';
    if (clean.includes('extract') || clean.includes('content') || clean.includes('summary')) return 'extract_page_content';
    if (clean.includes('back')) return 'go_back';
    if (clean.includes('forward')) return 'go_forward';
    if (clean.includes('reload') || clean.includes('refresh')) return 'reload_page';
    if (clean.includes('wait')) return 'wait_for_element';
    if (clean.includes('sleep')) return 'sleep';
    if (clean.includes('javascript') || clean.includes('exec') || clean.includes('js')) return 'execute_javascript';
    if (clean.includes('highlight')) return 'highlight_element';
    return name.trim();
  }

  /**
   * System prompt generator with active tab DOM context
   */
  buildSystemPrompt(pageState = null) {
    let prompt = `You are Hermes AI Agent, an intelligent, fast, autonomous browser copilot.
You assist the user by directly interacting with live web pages, filling forms, reading tables, navigating complex nested frames (like university/enterprise portals), solving CAPTCHAs via live screenshots, and summarizing content.

Core Operational Rules:
1. ALWAYS use the provided tools to interact with web pages (e.g. click_element, type_text, select_dropdown, press_key, capture_screenshot, execute_javascript, navigate_to).
2. Elements inside nested frames and iframes are fully accessible and labeled with "[Frame: <Name>]". Use their [#ID] or target text (e.g. click_element({ text: "اطلاعات جامع دانشجو" })).
3. NEVER navigate to session CAPTCHA URLs (e.g. /captcha.aspx) with navigate_to! Doing so creates a new request and invalidates the session CAPTCHA. Instead, call capture_screenshot() to see the CAPTCHA on screen, read its characters visually, and type it into the CAPTCHA input field.
4. Persian University / Golestan System Knowledge & Menu Navigation:
   - Expanding Hierarchical Menus (Step-by-step Hover/Click):
     Step 1: Hover or click on the top menu category: hover_element({ text: "آموزش" }) or click_element({ text: "آموزش" })
     Step 2: Hover or click on the sub-menu: hover_element({ text: "دانشجو" }) or hover_element({ text: "گزارش های آموزش" })
     Step 3: Click on the target item: click_element({ text: "اطلاعات جامع دانشجو" }) or click_element({ text: "کارنامه" })
   - Instant JS Navigation (Alternative):
     execute_javascript({ code: "top.Commander?.go ? top.Commander.go('0', 12310, false) : (Commander?.go ? Commander.go('0', 12310, false) : null);" })
   - Quick Report/Form Number Jump:
     Type "122" (for Student Master Info) or "1000" (for Transcript) into the "شماره" input field and press Enter.
5. Respond in the user's language (Persian / فارسی or English). Use proper ZWNJ (نیمفاصله) in Persian.`;

    if (pageState && pageState.context) {
      prompt += `\n\n--- CURRENT ACTIVE WEB PAGE CONTEXT ---
Title: ${pageState.context.title || 'Untitled'}
URL: ${pageState.context.url || ''}
Domain: ${pageState.context.domain || ''}

Headings:
${(pageState.context.headings || []).join('\n') || 'None'}

Key Content Snippet:
${pageState.context.textSummary || 'None'}

--- INTERACTIVE ELEMENTS (Use these [#ID] with tools) ---
${pageState.interactiveTree || 'No interactive elements detected.'}
----------------------------------------`;
    }

    return prompt;
  }

  /**
   * Capture visible tab as data URL
   */
  async captureTabScreenshot() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (response) => {
        if (response && response.success && response.dataUrl) {
          resolve(response.dataUrl);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Execute an in-browser tool on the active tab
   */
  async executeTool(tabId, rawToolName, args = {}) {
    const toolName = this.normalizeToolName(rawToolName);
    
    let targetTabId = tabId;
    if (!targetTabId) {
      try {
        const [currTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTabId = currTab?.id;
      } catch (e) {}
    }

    // 1. Navigation & History
    if (toolName === 'navigate_to') {
      let targetUrl = args.url || args.link || args.href || '';
      if (!targetUrl) return { error: 'Missing destination URL' };
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      if (targetTabId) {
        await chrome.tabs.update(targetTabId, { url: targetUrl });
        await new Promise((r) => setTimeout(r, 1400));
        return { success: true, navigatedTo: targetUrl };
      }
      return { error: 'No active tab found to navigate' };
    }

    if (toolName === 'go_back') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TAB_GO_BACK', tabId: targetTabId }, async (res) => {
          await new Promise((r) => setTimeout(r, 1000));
          resolve(res || { success: true });
        });
      });
    }

    if (toolName === 'go_forward') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TAB_GO_FORWARD', tabId: targetTabId }, async (res) => {
          await new Promise((r) => setTimeout(r, 1000));
          resolve(res || { success: true });
        });
      });
    }

    if (toolName === 'reload_page') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TAB_RELOAD', tabId: targetTabId, bypassCache: args.bypass_cache }, async (res) => {
          await new Promise((r) => setTimeout(r, 1500));
          resolve(res || { success: true });
        });
      });
    }

    // 2. Vision / Screenshot Capture
    if (toolName === 'capture_screenshot') {
      const snapUrl = await this.captureTabScreenshot();
      if (snapUrl) {
        return { success: true, message: 'Screenshot captured successfully', dataUrl: snapUrl };
      }
      return { success: false, error: 'Could not capture screenshot' };
    }

    // 3. Sleep / Delay
    if (toolName === 'sleep') {
      const secs = Math.min(10, Math.max(1, Number(args.seconds) || 2));
      await new Promise((r) => setTimeout(r, secs * 1000));
      return { success: true, message: `Waited ${secs} seconds` };
    }

    // 4. In-Page DOM Actions (Content Script)
    if (toolName === 'click_element') {
      const elemId = args.id !== undefined ? Number(args.id) : (args.element_id !== undefined ? Number(args.element_id) : undefined);
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'click',
        params: { id: elemId, selector: args.selector, text: args.text || args.label || args.name || '' }
      });
    }

    if (toolName === 'type_text') {
      const elemId = args.id !== undefined ? Number(args.id) : (args.element_id !== undefined ? Number(args.element_id) : undefined);
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'type',
        params: {
          id: elemId,
          selector: args.selector,
          text: args.text || args.value || '',
          clearFirst: args.clear_first !== false,
          pressEnter: args.press_enter === true || args.enter === true,
          targetText: args.target_text || args.label || ''
        }
      });
    }

    if (toolName === 'select_dropdown') {
      const elemId = args.id !== undefined ? Number(args.id) : undefined;
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'select_dropdown',
        params: { id: elemId, selector: args.selector, value: args.value, text: args.text }
      });
    }

    if (toolName === 'hover_element') {
      const elemId = args.id !== undefined ? Number(args.id) : undefined;
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'hover',
        params: { id: elemId, selector: args.selector, text: args.text || args.label || args.name || '' }
      });
    }

    if (toolName === 'press_key') {
      const elemId = args.id !== undefined ? Number(args.id) : undefined;
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'press_key',
        params: {
          key: args.key || 'Enter',
          id: elemId,
          modifiers: { ctrl: !!args.ctrl, shift: !!args.shift, alt: !!args.alt }
        }
      });
    }

    if (toolName === 'wait_for_element') {
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'wait_for',
        params: { selector: args.selector, text: args.text, timeoutMs: args.timeout_ms || 5000 }
      });
    }

    if (toolName === 'execute_javascript') {
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'execute_js',
        params: { code: args.code }
      });
    }

    if (toolName === 'scroll_page') {
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'scroll',
        params: { direction: args.direction, amount: args.amount }
      });
    }

    if (toolName === 'extract_page_content') {
      const res = await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXTRACT_CONTENT'
      });
      return res.success ? res.data : { error: res.error };
    }

    if (toolName === 'highlight_element') {
      const elemId = args.id !== undefined ? Number(args.id) : undefined;
      return await this.sendTabMessage(targetTabId, {
        type: 'HERMES_EXECUTE_ACTION',
        action: 'highlight',
        params: { id: elemId, label: args.label }
      });
    }

    return { error: `Unknown tool: ${rawToolName}` };
  }

  /**
   * Safe tab messaging with auto-injection
   */
  async sendTabMessage(tabId, message) {
    if (!tabId) {
      return { success: false, error: 'No active tab available' };
    }
    try {
      const res = await chrome.tabs.sendMessage(tabId, message);
      return res || { success: false, error: 'No response from tab' };
    } catch (err) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['js/content-script.js']
        });
        await new Promise((r) => setTimeout(r, 150));
        const res = await chrome.tabs.sendMessage(tabId, message);
        return res || { success: false, error: 'No response after injection' };
      } catch (injectErr) {
        return { success: false, error: `Tab communication error: ${injectErr.message}` };
      }
    }
  }

  /**
   * Fetch live page state (interactive DOM tree) from active tab
   */
  async getPageState(tabId) {
    const res = await this.sendTabMessage(tabId, { type: 'HERMES_GET_PAGE_STATE' });
    return res.success ? res : null;
  }

  /**
   * Abort ongoing agent execution
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Run the full ReAct Agent multi-step loop
   */
  async runAgentLoop({
    tabId,
    userPrompt,
    screenshotDataUrl = null,
    history = [],
    onToken = () => {},
    onToolStart = () => {},
    onToolEnd = () => {},
    onStatus = () => {}
  }) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // 1. Fetch live DOM context from active tab
    onStatus('Scanning page DOM & nested frames...');
    let pageState = null;
    if (this.autoDom && tabId) {
      try {
        pageState = await this.getPageState(tabId);
      } catch (e) {
        console.warn('Failed to fetch page state:', e);
      }
    }

    // 2. Prepare conversation messages
    const systemPrompt = this.buildSystemPrompt(pageState);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    // Build the user message (with optional Vision screenshot)
    if (screenshotDataUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: screenshotDataUrl,
              detail: 'auto'
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: userPrompt
      });
    }

    let currentStep = 0;
    let finalAssistantText = '';

    while (currentStep < this.maxSteps) {
      if (signal.aborted) break;
      currentStep++;

      onStatus(currentStep === 1 ? 'Reasoning...' : `Step ${currentStep}/${this.maxSteps}: Executing...`);

      let stepText = '';
      let toolCalls = [];

      try {
        const streamResult = await this.streamCompletion({
          messages,
          tools: this.tools,
          signal,
          onToken: (chunk) => {
            stepText += chunk;
            onToken(chunk);
          }
        });

        toolCalls = streamResult.toolCalls || [];
        stepText = streamResult.fullText || stepText;
      } catch (err) {
        if (signal.aborted) {
          onStatus('Cancelled by user.');
          break;
        }
        throw err;
      }

      // If no tool calls were made, we have reached the final answer
      if (!toolCalls || toolCalls.length === 0) {
        finalAssistantText = stepText;
        break;
      }

      // Append assistant turn to conversation history
      messages.push({
        role: 'assistant',
        content: stepText || null,
        tool_calls: toolCalls
      });

      // Execute each tool call sequentially
      for (const tc of toolCalls) {
        if (signal.aborted) break;

        const rawToolName = tc.function.name;
        const toolName = this.normalizeToolName(rawToolName);
        let args = {};
        try {
          args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        } catch (e) {
          args = {};
        }

        onToolStart(toolName, args);

        const result = await this.executeTool(tabId, toolName, args);
        onToolEnd(toolName, result);

        // Append tool execution result into message thread
        messages.push({
          role: 'tool',
          tool_call_id: tc.id || `call_${Date.now()}`,
          name: toolName,
          content: JSON.stringify(result)
        });

        // Special handling: if tool was capture_screenshot, feed the new image back to the model!
        if (toolName === 'capture_screenshot' && result?.dataUrl) {
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: '[System Vision Context: Latest live screenshot of the tab attached below]' },
              { type: 'image_url', image_url: { url: result.dataUrl, detail: 'auto' } }
            ]
          });
        }

        await new Promise((r) => setTimeout(r, 400));
      }

      // Refresh page state for next reasoning turn if DOM changed
      if (this.autoDom && tabId && !signal.aborted) {
        try {
          const freshState = await this.getPageState(tabId);
          if (freshState) {
            messages.push({
              role: 'system',
              content: `[Updated Page State after action]\nTitle: ${freshState.context.title}\nInteractive Elements:\n${freshState.interactiveTree}`
            });
          }
        } catch (e) {}
      }
    }

    onStatus('');
    return finalAssistantText;
  }

  /**
   * OpenAI-compatible SSE Stream consumer for OmniRoute / Oxiroute
   */
  async streamCompletion({ messages, tools, signal, onToken }) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.model,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      stream: true,
      temperature: 0.2
    };

    let url = this.baseUrl.replace(/\/+$/, '');
    if (!url.endsWith('/chat/completions')) {
      url += '/chat/completions';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway Error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    const toolCallsMap = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            const choice = data.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;

            if (delta?.content) {
              fullText += delta.content;
              onToken(delta.content);
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsMap.has(idx)) {
                  toolCallsMap.set(idx, {
                    id: tc.id || `call_${idx}_${Date.now()}`,
                    type: 'function',
                    function: {
                      name: '',
                      arguments: ''
                    }
                  });
                }
                const existing = toolCallsMap.get(idx);
                if (tc.id) existing.id = tc.id;
                
                if (tc.function?.name) {
                  if (!existing.function.name) {
                    existing.function.name = tc.function.name;
                  } else if (tc.function.name !== existing.function.name) {
                    if (tc.function.name.startsWith(existing.function.name)) {
                      existing.function.name = tc.function.name;
                    }
                  }
                }

                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    const toolCalls = Array.from(toolCallsMap.values()).filter((tc) => tc.function.name);
    return { fullText, toolCalls };
  }
}

window.HermesAgentEngine = HermesAgentEngine;
