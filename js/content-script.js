/**
 * Hermes AI Agent - Advanced In-Page Content Script
 * Supports Deep Nested Frame/iFrame crawling, Robust Text/Contains Resolution,
 * Table & Tree-View Menu Item identification, CSP-safe JS Execution, and Synthetic Events.
 */

(() => {
  // Prevent duplicate execution in same context
  if (window.__HERMES_AGENT_INITIALIZED__) {
    return;
  }
  window.__HERMES_AGENT_INITIALIZED__ = true;

  // Cache for assigned element IDs across all frames in current session
  let elementIdMap = new Map();
  let nextElementId = 1;
  let highlightOverlay = null;

  /**
   * Helper: Normalize Persian and English text for resilient matching
   */
  function normalizePersianText(str) {
    if (!str) return '';
    return str
      .toString()
      .replace(/[\u200c\u200b\s]+/g, ' ')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics
      .trim()
      .toLowerCase();
  }

  /**
   * Helper: Clean and truncate whitespace
   */
  function cleanText(text, maxLen = 140) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.slice(0, maxLen - 3) + '...';
  }

  /**
   * Helper: Recursively collect all accessible document roots (Top window + all nested <frame> & <iframe>)
   */
  function getAllDocumentRoots(rootDoc = document, depth = 0, frameName = 'Top') {
    let docs = [{ doc: rootDoc, depth, frameName, frameElement: null }];
    
    if (depth > 8) return docs;

    try {
      const frames = Array.from(rootDoc.querySelectorAll('iframe, frame'));
      for (const f of frames) {
        try {
          const subDoc = f.contentDocument;
          const subFrameName = f.getAttribute('name') || f.getAttribute('id') || `Frame_${f.tagName.toLowerCase()}`;
          if (subDoc && subDoc.body) {
            const nested = getAllDocumentRoots(subDoc, depth + 1, subFrameName);
            if (nested.length > 0) {
              nested[0].frameElement = f;
            }
            docs = docs.concat(nested);
          }
        } catch (crossOriginErr) {}
      }
    } catch (e) {}

    return docs;
  }

  /**
   * Helper: Check if an element is visible in its document viewport
   */
  function isElementVisible(el, doc) {
    if (!el || !(el instanceof Element)) return false;
    if (el.closest?.('#hermes-agent-highlight-layer')) return false;

    try {
      const win = doc.defaultView || window;
      const style = win.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return false;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper: Get direct meaningful text of an element (labels, placeholders, values, aria)
   */
  function getElementLabel(el, doc) {
    const aria = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt');
    if (aria) return cleanText(aria);

    if (el.placeholder) return cleanText(el.placeholder);

    if (el.id) {
      const labelTag = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (labelTag) {
        const lbl = cleanText(labelTag.innerText);
        if (lbl) return lbl;
      }
    }
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const lbl = cleanText(parentLabel.innerText);
      if (lbl) return lbl;
    }

    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
      return cleanText(el.value);
    }

    const inner = cleanText(el.innerText || el.textContent);
    return inner;
  }

  /**
   * Scan and build a semantic interactive element tree across TOP window AND ALL NESTED FRAMES
   */
  function scanInteractiveElements() {
    elementIdMap.clear();
    nextElementId = 1;

    const selector = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="switch"]',
      '[role="textbox"]',
      '[role="searchbox"]',
      '[role="option"]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      '[onclick]',
      'td[onclick]',
      'tr[onclick]',
      'nobr',
      '.treeItem',
      '[class*="menu"]',
      '[id*="menu"]',
      '[id*="Tree"]'
    ].join(', ');

    const docRoots = getAllDocumentRoots();
    const items = [];

    for (const { doc, frameName, frameElement } of docRoots) {
      let candidateElements = [];
      try {
        candidateElements = Array.from(doc.querySelectorAll(selector));
      } catch (e) {
        continue;
      }

      for (const el of candidateElements) {
        if (!isElementVisible(el, doc)) continue;

        // If it's a generic container (nobr/span/td), only include if it has non-empty text <= 60 chars
        const tag = el.tagName.toLowerCase();
        if (tag === 'nobr' || tag === 'td' || tag === 'span' || tag === 'div') {
          const txt = cleanText(el.innerText || el.textContent);
          if (!txt || txt.length > 60 || el.children.length > 3) {
            continue;
          }
        }

        const id = nextElementId++;
        el.setAttribute('data-hermes-agent-id', id.toString());
        elementIdMap.set(id, { el, doc, frameName, frameElement });

        const type = (el.getAttribute('type') || '').toLowerCase();
        const nameAttr = el.getAttribute('name') || el.id || '';
        const label = getElementLabel(el, doc);
        const rect = el.getBoundingClientRect();

        let desc = `[#${id}]`;
        if (frameName !== 'Top') {
          desc += ` [Frame: ${frameName}]`;
        }
        desc += ` ${tag}`;
        if (type) desc += `[type="${type}"]`;
        if (nameAttr) desc += `[name="${nameAttr}"]`;
        if (label) desc += ` "${label}"`;

        if (tag === 'a') {
          const href = el.getAttribute('href');
          if (href && !href.startsWith('javascript:')) {
            desc += ` (href="${cleanText(href, 80)}")`;
          }
        } else if (tag === 'input' || tag === 'textarea') {
          if (el.value && type !== 'password') {
            desc += ` (val="${cleanText(el.value, 40)}")`;
          } else if (type === 'password' && el.value) {
            desc += ' (val="[MASKED]")';
          }
          if (type === 'checkbox' || type === 'radio') {
            desc += el.checked ? ' [checked]' : ' [unchecked]';
          }
        } else if (tag === 'select') {
          const selected = el.options[el.selectedIndex]?.text;
          if (selected) desc += ` (selected="${cleanText(selected, 30)}")`;
        }

        if (el.disabled) desc += ' [disabled]';

        items.push({
          id,
          frame: frameName,
          tag,
          type,
          label,
          desc,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height)
          }
        });
      }
    }

    return items;
  }

  /**
   * Extract key page context
   */
  function extractPageContext() {
    const title = document.title || '';
    const url = window.location.href;
    const domain = window.location.hostname;

    const docRoots = getAllDocumentRoots();
    const headings = [];
    const paragraphs = [];

    for (const { doc, frameName } of docRoots) {
      try {
        const frameHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'))
          .filter((h) => isElementVisible(h, doc))
          .map((h) => `${frameName !== 'Top' ? `[${frameName}] ` : ''}${h.tagName}: ${cleanText(h.innerText, 80)}`);
        headings.push(...frameHeadings);

        const frameParas = Array.from(doc.querySelectorAll('p, li, td, span, nobr'))
          .filter((p) => isElementVisible(p, doc))
          .map((p) => cleanText(p.innerText, 150))
          .filter((t) => t.length > 15);
        paragraphs.push(...frameParas.slice(0, 15));
      } catch (e) {}
    }

    return {
      title,
      url,
      domain,
      headings: headings.slice(0, 15),
      textSummary: paragraphs.slice(0, 20).join('\n').slice(0, 3500),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight
      }
    };
  }

  /**
   * Full Clean Content Extractor across all frames
   */
  function extractCleanMarkdown() {
    const docRoots = getAllDocumentRoots();
    const sections = [];

    for (const { doc, frameName } of docRoots) {
      try {
        const clone = doc.body.cloneNode(true);
        const junk = clone.querySelectorAll('script, style, noscript, iframe, frame, svg, canvas, #hermes-agent-highlight-layer');
        junk.forEach((el) => el.remove());

        let text = clone.innerText || '';
        text = text.replace(/\n{3,}/g, '\n\n').trim();

        if (text) {
          sections.push(`### Frame: ${frameName}\n${text}`);
        }
      } catch (e) {}
    }

    return {
      title: document.title,
      url: window.location.href,
      content: sections.join('\n\n---\n\n').slice(0, 25000)
    };
  }

  /**
   * Get element absolute screen coordinates
   */
  function getAbsoluteBoundingRect(el, doc) {
    let rect = el.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    let width = rect.width;
    let height = rect.height;

    let curDoc = doc;
    while (curDoc && curDoc.defaultView && curDoc.defaultView !== window.top) {
      try {
        const frameEl = curDoc.defaultView.frameElement;
        if (!frameEl) break;
        const frameRect = frameEl.getBoundingClientRect();
        left += frameRect.left;
        top += frameRect.top;
        curDoc = frameEl.ownerDocument;
      } catch (e) {
        break;
      }
    }

    return { left, top, width, height };
  }

  /**
   * Visual feedback overlay on active element
   */
  function highlightElementOnScreen(el, doc = document, label = '', durationMs = 2500) {
    if (!highlightOverlay) {
      highlightOverlay = document.createElement('div');
      highlightOverlay.id = 'hermes-agent-highlight-layer';
      highlightOverlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
        border: 2px solid #00ffaa;
        background: rgba(0, 255, 170, 0.14);
        box-shadow: 0 0 18px rgba(0, 255, 170, 0.7), inset 0 0 8px rgba(0, 255, 170, 0.3);
        border-radius: 6px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: none;
      `;

      const badge = document.createElement('div');
      badge.id = 'hermes-highlight-badge';
      badge.style.cssText = `
        position: absolute;
        top: -24px;
        left: 0;
        background: #000;
        color: #00ffaa;
        border: 1px solid #00ffaa;
        font-family: monospace;
        font-size: 11px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.8);
      `;
      highlightOverlay.appendChild(badge);
      document.documentElement.appendChild(highlightOverlay);
    }

    if (!el) {
      highlightOverlay.style.display = 'none';
      return;
    }

    const { left, top, width, height } = getAbsoluteBoundingRect(el, doc);
    highlightOverlay.style.display = 'block';
    highlightOverlay.style.top = `${Math.max(0, top - 2)}px`;
    highlightOverlay.style.left = `${Math.max(0, left - 2)}px`;
    highlightOverlay.style.width = `${Math.max(16, width + 4)}px`;
    highlightOverlay.style.height = `${Math.max(16, height + 4)}px`;

    const badge = highlightOverlay.querySelector('#hermes-highlight-badge');
    if (badge) {
      badge.textContent = label || '✦ Hermes Agent';
    }

    if (durationMs > 0) {
      clearTimeout(highlightOverlay._hideTimer);
      highlightOverlay._hideTimer = setTimeout(() => {
        if (highlightOverlay) highlightOverlay.style.display = 'none';
      }, durationMs);
    }
  }

  /**
   * Resilient Element Resolver: supports numerical [#ID], valid CSS selectors,
   * jQuery-style :contains('text'), and direct visible text matching across all frames.
   */
  function resolveElement(id, selector, text) {
    if (id && elementIdMap.has(Number(id))) {
      return elementIdMap.get(Number(id));
    }

    const docRoots = getAllDocumentRoots();

    let containsText = text || '';
    let cleanSelector = selector || '';

    // Handle jQuery-style :contains('...') or :contains("...")
    if (cleanSelector && cleanSelector.includes(':contains(')) {
      const match = cleanSelector.match(/:contains\(['"]?([^'"]+)['"]?\)/i);
      if (match && match[1]) {
        containsText = match[1];
        cleanSelector = cleanSelector.replace(/:contains\(['"]?[^'"]+['"]?\)/ig, '').trim();
        if (cleanSelector.endsWith(',')) cleanSelector = cleanSelector.slice(0, -1).trim();
      }
    }

    // Direct CSS selector search if valid
    if (cleanSelector && cleanSelector !== '*' && !cleanSelector.includes(':contains')) {
      try {
        for (const { doc, frameName, frameElement } of docRoots) {
          const el = doc.querySelector(cleanSelector);
          if (el) {
            return { el, doc, frameName, frameElement };
          }
        }
      } catch (e) {}
    }

    // Search by visible text content across all frames
    if (containsText) {
      const normTarget = normalizePersianText(containsText);
      let bestMatch = null;
      let bestMatchLen = Infinity;

      for (const { doc, frameName, frameElement } of docRoots) {
        const candidates = Array.from(doc.querySelectorAll('a, button, input, td, th, nobr, span, div, li, p, label'));
        for (const el of candidates) {
          if (!isElementVisible(el, doc)) continue;

          const elText = normalizePersianText(el.innerText || el.textContent || el.getAttribute('value') || el.getAttribute('title') || '');
          if (elText.includes(normTarget)) {
            if (elText.length < bestMatchLen) {
              bestMatch = { el, doc, frameName, frameElement };
              bestMatchLen = elText.length;
            }
          }
        }
      }

      if (bestMatch) {
        let leaf = bestMatch.el;
        while (leaf && leaf.children && leaf.children.length > 0) {
          let foundChild = false;
          for (const child of leaf.children) {
            const childText = normalizePersianText(child.innerText || child.textContent || '');
            if (childText.includes(normTarget)) {
              leaf = child;
              foundChild = true;
              break;
            }
          }
          if (!foundChild) break;
        }
        bestMatch.el = leaf;
        return bestMatch;
      }
    }

    return null;
  }

  /**
   * Action Executor: Click element (works on text nodes, table rows, and nested frames)
   */
  async function actionClick(id, selector, text) {
    const resolved = resolveElement(id, selector, text);
    if (!resolved) {
      return { success: false, error: `Element not found: id=${id} selector=${selector} text=${text}` };
    }

    const { el, doc, frameName } = resolved;

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 180));

    highlightElementOnScreen(el, doc, `Click [#${id || ''}] ${cleanText(text || el.innerText || '')}`);

    el.focus?.();

    const win = doc.defaultView || window;
    const clickEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (const evtName of clickEvents) {
      try {
        const evt = new MouseEvent(evtName, {
          bubbles: true,
          cancelable: true,
          view: win,
          buttons: 1
        });
        el.dispatchEvent(evt);
      } catch (e) {}
    }

    // If native click exists
    if (typeof el.click === 'function') {
      try { el.click(); } catch (e) {}
    }

    // For table rows/cells in legacy systems (e.g. Golestan tree nodes), also bubble click to parent TR / A
    const parentClickable = el.closest?.('a, tr, [onclick], .treeItem');
    if (parentClickable && parentClickable !== el) {
      try {
        parentClickable.click?.();
        parentClickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      } catch (e) {}
    }

    return {
      success: true,
      message: `Clicked element [#${id || ''}] (${el.tagName.toLowerCase()}: "${cleanText(el.innerText || getElementLabel(el, doc))}") in frame: ${frameName}`,
      tag: el.tagName.toLowerCase(),
      label: getElementLabel(el, doc),
      frame: frameName
    };
  }

  /**
   * Action Executor: Type text
   */
  async function actionType(id, selector, text, clearFirst = true, pressEnter = false, targetText = '') {
    const resolved = resolveElement(id, selector, targetText);
    if (!resolved) {
      return { success: false, error: `Element not found: id=${id} selector=${selector} text=${targetText}` };
    }

    const { el, doc, frameName } = resolved;

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 150));

    highlightElementOnScreen(el, doc, `Type [#${id || ''}]`);
    el.focus();

    if (clearFirst) {
      el.value = '';
    }

    const win = doc.defaultView || window;
    const proto = win.HTMLInputElement?.prototype || HTMLInputElement.prototype;
    const taProto = win.HTMLTextAreaElement?.prototype || HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set ||
                         Object.getOwnPropertyDescriptor(taProto, 'value')?.set;

    const finalVal = clearFirst ? text : ((el.value || '') + text);

    if (nativeSetter) {
      try { nativeSetter.call(el, finalVal); } catch (e) { el.value = finalVal; }
    } else {
      el.value = finalVal;
    }

    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    if (pressEnter) {
      await new Promise((r) => setTimeout(r, 100));
      for (const k of ['keydown', 'keypress', 'keyup']) {
        el.dispatchEvent(new KeyboardEvent(k, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
      }

      if (el.form) {
        try { el.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } catch (e) {}
      }
    }

    return {
      success: true,
      message: `Typed "${text}" into [#${id || ''}] (frame: ${frameName})`,
      tag: el.tagName.toLowerCase(),
      frame: frameName
    };
  }

  /**
   * Action Executor: Select Dropdown Option (<select>)
   */
  async function actionSelectDropdown(id, selector, value, text) {
    const resolved = resolveElement(id, selector, text);
    if (!resolved) {
      return { success: false, error: `Select element not found: id=${id} selector=${selector}` };
    }

    const { el, doc, frameName } = resolved;
    if (el.tagName !== 'SELECT') {
      return { success: false, error: `Target element [#${id}] is not a <select> tag (got ${el.tagName})` };
    }

    let matchedIndex = -1;
    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (value && opt.value.toLowerCase() === value.toLowerCase()) {
        matchedIndex = i;
        break;
      }
      if (text && (normalizePersianText(opt.text).includes(normalizePersianText(text)))) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return { success: false, error: `Option not found for value="${value}" text="${text}"` };
    }

    el.selectedIndex = matchedIndex;
    highlightElementOnScreen(el, doc, `Select [#${id}]`);

    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    return {
      success: true,
      message: `Selected option "${el.options[matchedIndex].text}" in [#${id}]`,
      frame: frameName
    };
  }

  /**
   * Action Executor: Hover on element
   */
  async function actionHover(id, selector, text) {
    const resolved = resolveElement(id, selector, text);
    if (!resolved) {
      return { success: false, error: `Element not found: id=${id} selector=${selector} text=${text}` };
    }

    const { el, doc, frameName } = resolved;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    highlightElementOnScreen(el, doc, `Hover [#${id || ''}] ${cleanText(text || el.innerText || '')}`, 1500);

    const win = doc.defaultView || window;
    const hoverEvents = ['pointerover', 'mouseover', 'pointerenter', 'mouseenter', 'pointermove', 'mousemove'];
    for (const evt of hoverEvents) {
      try {
        el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: win }));
      } catch (e) {}
    }

    // Also bubble hover to parent table row/cell/menu container for legacy systems
    const parentHoverable = el.closest?.('a, tr, td, [onmouseover], [onmouseenter], .menuItem, .treeItem');
    if (parentHoverable && parentHoverable !== el) {
      for (const evt of hoverEvents) {
        try {
          parentHoverable.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: win }));
        } catch (e) {}
      }
    }

    return {
      success: true,
      message: `Hovered over element [#${id || ''}] ("${cleanText(text || el.innerText || '')}" in frame: ${frameName})`,
      frame: frameName
    };
  }

  /**
   * Action Executor: Press Key (Enter, Escape, Tab, Arrows, Space, etc.)
   */
  async function actionPressKey(key = 'Enter', modifiers = {}, targetId = null) {
    let targetEl = document.activeElement || document.body;
    let targetDoc = document;

    if (targetId) {
      const resolved = resolveElement(targetId);
      if (resolved) {
        targetEl = resolved.el;
        targetDoc = resolved.doc;
        targetEl.focus?.();
      }
    }

    const keyCodeMap = {
      'Enter': 13,
      'Escape': 27,
      'Tab': 9,
      'Backspace': 8,
      'Space': 32,
      'ArrowUp': 38,
      'ArrowDown': 40,
      'ArrowLeft': 37,
      'ArrowRight': 39,
      'Delete': 46
    };

    const keyCode = keyCodeMap[key] || key.charCodeAt(0) || 0;
    const win = targetDoc.defaultView || window;

    const eventInit = {
      key,
      code: key,
      keyCode,
      which: keyCode,
      ctrlKey: !!modifiers.ctrl,
      shiftKey: !!modifiers.shift,
      altKey: !!modifiers.alt,
      metaKey: !!modifiers.meta,
      bubbles: true,
      cancelable: true,
      view: win
    };

    for (const evtName of ['keydown', 'keypress', 'keyup']) {
      try {
        targetEl.dispatchEvent(new KeyboardEvent(evtName, eventInit));
      } catch (e) {}
    }

    return { success: true, message: `Dispatched key "${key}" to active element` };
  }

  /**
   * Action Executor: Wait for element to appear on page/frames
   */
  async function actionWaitFor(selector, text, timeoutMs = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const resolved = resolveElement(null, selector, text);
      if (resolved && isElementVisible(resolved.el, resolved.doc)) {
        return { success: true, message: `Element found in frame: ${resolved.frameName}` };
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return { success: false, error: `Timeout waiting for "${selector || text}" (${timeoutMs}ms)` };
  }

  /**
   * Action Executor: Execute custom JavaScript in the MAIN PAGE context (CSP-safe via script injection)
   */
  function actionExecuteJS(code) {
    return new Promise((resolve) => {
      try {
        const eventId = 'hermes_res_' + Math.random().toString(36).substring(2, 9);
        const scriptCode = `
          (function() {
            try {
              let targetWin = window;
              if (typeof top !== 'undefined' && top) {
                targetWin = top;
              }
              const res = (function() {
                ${code}
              })();
              const detail = { success: true, result: typeof res !== 'undefined' ? res : 'executed' };
              window.dispatchEvent(new CustomEvent('${eventId}', { detail }));
              try { if (window.top && window.top !== window) window.top.dispatchEvent(new CustomEvent('${eventId}', { detail })); } catch(e){}
            } catch(e) {
              const detail = { success: false, error: e.message || String(e) };
              window.dispatchEvent(new CustomEvent('${eventId}', { detail }));
              try { if (window.top && window.top !== window) window.top.dispatchEvent(new CustomEvent('${eventId}', { detail })); } catch(e){}
            }
          })();
        `;

        let resolved = false;
        const handler = (evt) => {
          if (resolved) return;
          resolved = true;
          window.removeEventListener(eventId, handler);
          try { if (window.top) window.top.removeEventListener(eventId, handler); } catch(e){}
          resolve(evt.detail);
        };

        window.addEventListener(eventId, handler);
        try { if (window.top && window.top !== window) window.top.addEventListener(eventId, handler); } catch(e){}

        const docRoots = getAllDocumentRoots();
        for (const { doc } of docRoots) {
          try {
            const script = doc.createElement('script');
            script.textContent = scriptCode;
            (doc.head || doc.documentElement || doc.body).appendChild(script);
            setTimeout(() => { try { script.remove(); } catch(e){} }, 1000);
          } catch(e) {}
        }

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener(eventId, handler);
            try { if (window.top) window.top.removeEventListener(eventId, handler); } catch(e){}
            resolve({ success: true, result: 'Script injected across frames' });
          }
        }, 3000);
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  /**
   * Action Executor: Scroll viewport
   */
  async function actionScroll(direction = 'down', amount = 450) {
    const scrollVal = typeof amount === 'number' ? amount : 450;

    if (direction === 'down') {
      window.scrollBy({ top: scrollVal, behavior: 'smooth' });
    } else if (direction === 'up') {
      window.scrollBy({ top: -scrollVal, behavior: 'smooth' });
    } else if (direction === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (direction === 'bottom') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }

    await new Promise((r) => setTimeout(r, 300));

    return {
      success: true,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight
    };
  }

  /**
   * Message Listener for SidePanel Controller
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HERMES_GET_PAGE_STATE') {
      try {
        const interactiveElements = scanInteractiveElements();
        const context = extractPageContext();
        const treeLines = interactiveElements.map((item) => item.desc).join('\n');

        sendResponse({
          success: true,
          context,
          interactiveCount: interactiveElements.length,
          interactiveTree: treeLines,
          elements: interactiveElements
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (message.type === 'HERMES_EXECUTE_ACTION') {
      const { action, params = {} } = message;

      (async () => {
        try {
          let res;
          if (action === 'click') {
            res = await actionClick(params.id, params.selector, params.text);
          } else if (action === 'type') {
            res = await actionType(params.id, params.selector, params.text, params.clearFirst !== false, params.pressEnter === true, params.targetText);
          } else if (action === 'select_dropdown') {
            res = await actionSelectDropdown(params.id, params.selector, params.value, params.text);
          } else if (action === 'hover') {
            res = await actionHover(params.id, params.selector, params.text);
          } else if (action === 'press_key') {
            res = await actionPressKey(params.key, params.modifiers, params.id);
          } else if (action === 'wait_for') {
            res = await actionWaitFor(params.selector, params.text, params.timeoutMs);
          } else if (action === 'execute_js') {
            res = await actionExecuteJS(params.code);
          } else if (action === 'scroll') {
            res = await actionScroll(params.direction, params.amount);
          } else if (action === 'highlight') {
            const resolved = resolveElement(params.id, params.selector, params.text);
            if (resolved) {
              highlightElementOnScreen(resolved.el, resolved.doc, params.label || '✦ Hermes');
            }
            res = { success: true };
          } else {
            res = { success: false, error: `Unknown action: ${action}` };
          }
          sendResponse(res);
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (message.type === 'HERMES_EXTRACT_CONTENT') {
      try {
        const result = extractCleanMarkdown();
        sendResponse({ success: true, data: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }
  });

  console.log('[Hermes AI Agent] Resilient DOM & Main-World Execution Ready ✦');
})();
