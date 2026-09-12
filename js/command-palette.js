// Hermes NewTab — Raycast-Style Command Palette & Smart Tab-Autocompletion

class CommandPalette {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.resultsDropdown = document.getElementById('search-results');
    this.ghostLayer = document.getElementById('search-ghost-layer');
    this.ghostMatchedEl = document.getElementById('ghost-matched-text');
    this.ghostSuffixEl = document.getElementById('ghost-suffix-text');
    this.tabChip = document.getElementById('tab-autocomplete-chip');
    this.engineBadge = document.getElementById('search-engine-badge');
    this.engineNameEl = document.getElementById('search-engine-name');
    this.quickTags = document.querySelectorAll('.quick-tag');

    this.results = [];
    this.selectedIndex = -1;
    this.ghostText = '';
    this.currentCompletion = null;

    this.searchEngines = {
      '/g': { name: 'Google', prefix: '/g ', placeholder: 'Search Google...', url: 'https://www.google.com/search?q=' },
      '/gh': { name: 'GitHub', prefix: '/gh ', placeholder: 'Search GitHub repos & code...', url: 'https://github.com/search?q=' },
      '/x': { name: 'X / Twitter', prefix: '/x ', placeholder: 'Search X (Twitter)...', url: 'https://x.com/search?q=' },
      '/p': { name: 'Perplexity', prefix: '/p ', placeholder: 'Ask Perplexity AI...', url: 'https://www.perplexity.ai/search?q=' },
      '/yt': { name: 'YouTube', prefix: '/yt ', placeholder: 'Search YouTube videos...', url: 'https://www.youtube.com/results?search_query=' },
      '/w': { name: 'Wikipedia', prefix: '/w ', placeholder: 'Search Wikipedia articles...', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
      '/ai': { name: 'Hermes AI', prefix: '/ai ', placeholder: 'Ask Hermes AI Agent (Alt+C)...', isAgent: true },
      '/b': { name: 'Bookmarks', prefix: '/b ', placeholder: 'Filter bookmarks only...', isFilter: true }
    };

    this.popularDomains = [
      'github.com',
      'claude.ai',
      'chatgpt.com',
      'perplexity.ai',
      'deepseek.com',
      'tradingview.com',
      'tetherland.com',
      'bitpin.ir',
      'arxiv.org',
      'huggingface.co',
      'figma.com',
      'google.com',
      'youtube.com',
      'x.com',
      'reddit.com',
      'wiki.archlinux.org',
      'hermes-agent.nousresearch.com'
    ];

    this.localServices = [
      { name: 'paperclip', port: 3100, url: 'http://localhost:3100', desc: 'Paperclip Control Plane' },
      { name: 'oxiroute', port: 20200, url: 'http://localhost:20200', desc: 'Oxiroute AI Router' },
      { name: 'omniroute', port: 20128, url: 'http://localhost:20128', desc: 'OmniRoute AI Gateway' },
      { name: 'golestan', port: 7667, url: 'http://localhost:7667', desc: 'Golestan Portal API' },
      { name: 'ayh', port: 3001, url: 'http://localhost:3001', desc: 'AYH Fullstack Admin' }
    ];
  }

  init() {
    this.refreshElements();
    this.setupKeyboardShortcuts();
    this.setupInputListeners();
    this.setupQuickTags();
    this.setupDocumentClickListener();

    setTimeout(() => {
      this.focusSearch();
    }, 60);
  }

  refreshElements() {
    this.searchInput = document.getElementById('search-input');
    this.resultsDropdown = document.getElementById('search-results');
    this.ghostLayer = document.getElementById('search-ghost-layer');
    this.ghostMatchedEl = document.getElementById('ghost-matched-text');
    this.ghostSuffixEl = document.getElementById('ghost-suffix-text');
    this.tabChip = document.getElementById('tab-autocomplete-chip');
    this.engineBadge = document.getElementById('search-engine-badge');
    this.engineNameEl = document.getElementById('search-engine-name');
    this.quickTags = document.querySelectorAll('.quick-tag');
  }

  /* ============================================================
     KEYBOARD SHORTCUTS & LISTENERS
     ============================================================ */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Global Ctrl+K / Cmd+K / Slash focus
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.focusSearch();
      } else if (e.key === '/' && document.activeElement !== this.searchInput && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        this.focusSearch();
      } else if (e.key === 'Escape') {
        this.clearAndClose();
      }
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    }
  }

  setupInputListeners() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      this.onQueryChange(e.target.value);
    });

    this.searchInput.addEventListener('focus', () => {
      const val = this.searchInput.value;
      if (val && val.trim()) {
        this.onQueryChange(val);
      }
    });
  }

  setupQuickTags() {
    if (this.tabChip) {
      this.tabChip.addEventListener('click', () => {
        this.acceptGhostAutocomplete();
      });
    }
  }

  setupDocumentClickListener() {
    document.addEventListener('click', (e) => {
      const container = document.querySelector('.spotlight-search-container');
      if (container && !container.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  focusSearch() {
    if (!this.searchInput) return;
    this.searchInput.focus();
    this.searchInput.select();
  }

  clearAndClose() {
    if (!this.searchInput) return;
    this.searchInput.value = '';
    this.clearGhostAutocomplete();
    this.hideResults();
    this.searchInput.blur();
  }

  /* ============================================================
     SMART AUTOCOMPLETE & GHOST TEXT (TAB COMPLETION)
     ============================================================ */
  clearGhostAutocomplete() {
    this.ghostText = '';
    this.currentCompletion = null;
    if (this.ghostMatchedEl) this.ghostMatchedEl.textContent = '';
    if (this.ghostSuffixEl) this.ghostSuffixEl.textContent = '';
    if (this.tabChip) this.tabChip.style.display = 'none';
  }

  updateGhostAutocomplete(rawInput) {
    if (!rawInput || !rawInput.trim()) {
      this.clearGhostAutocomplete();
      return;
    }

    const inputVal = rawInput;
    const lowerInput = inputVal.toLowerCase();

    // 1. Check search engine prefixes
    const prefixCandidates = Object.values(this.searchEngines).map(e => e.prefix);
    for (const prefix of prefixCandidates) {
      if (prefix.toLowerCase().startsWith(lowerInput) && prefix.length > inputVal.length) {
        this.setGhostMatch(inputVal, prefix.slice(inputVal.length), inputVal + prefix.slice(inputVal.length));
        return;
      }
    }

    // 2. Check local services
    for (const svc of this.localServices) {
      if (svc.name.toLowerCase().startsWith(lowerInput) && svc.name.length > inputVal.length) {
        this.setGhostMatch(inputVal, svc.name.slice(inputVal.length), svc.name);
        return;
      }
      const hostPort = `localhost:${svc.port}`;
      if (hostPort.startsWith(lowerInput) && hostPort.length > inputVal.length) {
        this.setGhostMatch(inputVal, hostPort.slice(inputVal.length), hostPort);
        return;
      }
    }

    // 3. Check popular domains
    for (const domain of this.popularDomains) {
      if (domain.toLowerCase().startsWith(lowerInput) && domain.length > inputVal.length) {
        this.setGhostMatch(inputVal, domain.slice(inputVal.length), domain);
        return;
      }
    }

    // 4. Check bookmarks
    if (window.bookmarksEngine && Array.isArray(window.bookmarksEngine.bookmarks)) {
      for (const bm of window.bookmarksEngine.bookmarks) {
        const d = bm.domain || '';
        if (d.toLowerCase().startsWith(lowerInput) && d.length > inputVal.length) {
          this.setGhostMatch(inputVal, d.slice(inputVal.length), d);
          return;
        }
        const t = bm.title || '';
        if (t.toLowerCase().startsWith(lowerInput) && t.length > inputVal.length) {
          this.setGhostMatch(inputVal, t.slice(inputVal.length), t);
          return;
        }
      }
    }

    // No matching ghost autocompletion
    this.clearGhostAutocomplete();
  }

  setGhostMatch(matchedPart, suffix, fullReplacement) {
    this.ghostText = suffix;
    this.currentCompletion = fullReplacement;

    if (this.ghostMatchedEl) this.ghostMatchedEl.textContent = matchedPart;
    if (this.ghostSuffixEl) this.ghostSuffixEl.textContent = suffix;
    if (this.tabChip) this.tabChip.style.display = 'inline-flex';
  }

  acceptGhostAutocomplete() {
    if (!this.currentCompletion || !this.searchInput) return false;
    this.searchInput.value = this.currentCompletion;
    this.searchInput.focus();
    this.clearGhostAutocomplete();
    this.onQueryChange(this.searchInput.value);
    
    // Set caret at end
    const len = this.searchInput.value.length;
    this.searchInput.setSelectionRange(len, len);
    return true;
  }

  /* ============================================================
     QUERY PROCESSING & SEARCH LOGIC
     ============================================================ */
  tryEvaluateMath(expr) {
    if (!expr) return null;
    const sanitized = expr
      .replace(/\^/g, '**')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '')
      .trim();

    if (!/^[\d\s\+\-\*\/\(\)\.\%]+$/.test(sanitized)) return null;
    if (!/[\+\-\*\/]/.test(sanitized)) return null;

    try {
      const fn = new Function('"use strict"; return (' + sanitized + ');');
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return val;
      }
    } catch {}
    return null;
  }

  isDirectUrl(str) {
    if (!str) return false;
    const s = str.trim();
    if (/^https?:\/\//i.test(s)) return true;
    if (/^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/i.test(s)) return true;
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(s)) return true;
    return false;
  }

  formatDirectUrl(str) {
    const s = str.trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^(localhost|127\.0\.0\.1)/i.test(s)) return 'http://' + s;
    return 'https://' + s;
  }

  extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  updateEngineScopeBadge(engineName = 'All') {
    if (this.engineNameEl) {
      this.engineNameEl.textContent = engineName;
    }
  }

  onQueryChange(rawQuery) {
    const query = (rawQuery || '').trim();
    this.updateGhostAutocomplete(rawQuery);

    if (!query) {
      this.updateEngineScopeBadge('All');
      this.hideResults();
      return;
    }

    // 1. Direct URL check
    if (this.isDirectUrl(query)) {
      this.updateEngineScopeBadge('URL');
      const targetUrl = this.formatDirectUrl(query);
      const displayHost = targetUrl.replace(/^https?:\/\//i, '');
      const matchedBookmarks = window.bookmarksEngine 
        ? window.bookmarksEngine.searchBookmarks(query) 
        : [];

      this.results = [
        {
          type: 'url',
          title: `Open ${displayHost}`,
          url: targetUrl,
          domain: displayHost,
          icon: 'external'
        },
        ...matchedBookmarks.map(bm => ({
          type: 'bookmark',
          title: bm.title,
          url: bm.url,
          domain: bm.domain,
          category: bm.category,
          favicon: bm.favicon
        }))
      ];
      this.selectedIndex = 0;
      this.renderResults();
      return;
    }

    // 2. Math calculation check
    const mathResult = this.tryEvaluateMath(query);
    if (mathResult !== null) {
      this.updateEngineScopeBadge('Calc');
      const formatted = Number.isInteger(mathResult) 
        ? mathResult.toLocaleString('en-US') 
        : mathResult.toLocaleString('en-US', { maximumFractionDigits: 6 });
      
      this.results = [{
        type: 'calculator',
        title: `= ${formatted}`,
        url: `Calculated: ${query} (Click or Enter to copy)`,
        value: String(mathResult),
        icon: 'calculator'
      }];
      this.selectedIndex = 0;
      this.renderResults();
      return;
    }

    // 3. Prefix search shortcuts (/g, /gh, /x, /p, /yt, /w, /b)
    for (const [prefix, engine] of Object.entries(this.searchEngines)) {
      if (query.startsWith(prefix + ' ') || query === prefix || query.startsWith(prefix)) {
        this.updateEngineScopeBadge(engine.name);
        const term = query.slice(prefix.length).trim();

        if (engine.isFilter) {
          // Bookmarks filter
          const matchedBookmarks = window.bookmarksEngine 
            ? window.bookmarksEngine.searchBookmarks(term) 
            : [];
          this.results = matchedBookmarks.map(bm => ({
            type: 'bookmark',
            title: bm.title,
            url: bm.url,
            domain: bm.domain,
            category: bm.category,
            favicon: bm.favicon
          }));
        } else if (engine.isAgent) {
          this.results = [{
            type: 'agent',
            title: `Ask Hermes AI: "${term || 'Open Side Panel'}"`,
            url: '#hermes-ai-sidepanel',
            icon: 'sparkle',
            queryText: term,
            action: () => {
              chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (res) => {
                if (!res || !res.success) {
                  chrome.sidePanel?.open?.({ windowId: chrome.windows?.WINDOW_ID_CURRENT }).catch(() => {
                    console.log('Sidepanel open hint: Press Alt+C');
                  });
                }
              });
            }
          }];
        } else {
          // Engine query
          this.results = [{
            type: 'engine',
            title: `Search ${engine.name} for "${term || '...'}"`,
            url: engine.url + encodeURIComponent(term),
            icon: 'search',
            queryText: term
          }];
        }

        this.selectedIndex = 0;
        this.renderResults();
        return;
      }
    }

    this.updateEngineScopeBadge('All');

    // 4. Match local services
    const matchedServices = this.localServices.filter(svc => {
      const s = query.toLowerCase();
      return svc.name.toLowerCase().includes(s) || String(svc.port).includes(s);
    });

    // 5. Match bookmarks
    const matchedBookmarks = window.bookmarksEngine 
      ? window.bookmarksEngine.searchBookmarks(query) 
      : [];

    const defaultSearch = {
      type: 'engine',
      title: `Search Google for "${query}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      icon: 'search',
      queryText: query
    };

    this.results = [
      ...matchedServices.map(svc => ({
        type: 'service',
        title: `${svc.name} (${svc.desc})`,
        url: svc.url,
        domain: `localhost:${svc.port}`,
        icon: 'server'
      })),
      ...matchedBookmarks.map(bm => ({
        type: 'bookmark',
        title: bm.title,
        url: bm.url,
        domain: bm.domain,
        category: bm.category,
        favicon: bm.favicon
      })),
      defaultSearch
    ];

    this.selectedIndex = 0;
    this.renderResults();
  }

  renderItemIcon(res) {
    if (res.type === 'calculator') {
      return `<span class="search-result-icon icon-calc" style="color:var(--status-online);">${ICONS.calculator}</span>`;
    }
    if (res.type === 'service') {
      return `<span class="search-result-icon icon-service" style="color:var(--status-idle);">${ICONS.server}</span>`;
    }
    if (res.icon === 'external' || res.type === 'url') {
      return `<span class="search-result-icon icon-url" style="color:var(--accent-blue);">${ICONS.external}</span>`;
    }
    if (res.favicon) {
      const safeFav = this.escapeHtml(res.favicon);
      return `<span class="search-result-icon icon-favicon"><img src="${safeFav}" class="search-favicon-img" alt="" onerror="this.classList.add('img-error');" />${ICONS.globe}</span>`;
    }
    return `<span class="search-result-icon icon-search" style="color:var(--accent-blue);">${ICONS.search}</span>`;
  }

  /* ============================================================
     RENDER RESULTS
     ============================================================ */
  renderResults() {
    if (!this.resultsDropdown) return;

    if (this.results.length === 0) {
      this.hideResults();
      return;
    }

    this.resultsDropdown.innerHTML = this.results.map((res, idx) => {
      const isSelected = idx === this.selectedIndex ? 'selected' : '';
      const iconHtml = this.renderItemIcon(res);

      const catBadge = res.category 
        ? `<span style="font-size: 0.6rem; padding: 0.08rem 0.35rem; background: rgba(59, 130, 246, 0.15); border-radius: 4px; color: var(--accent-blue); font-family: var(--font-mono);">${this.escapeHtml(res.category)}</span>` 
        : '';

      return `
        <div class="search-result-item ${isSelected}" data-index="${idx}">
          ${iconHtml}
          <div class="search-result-info">
            <div class="search-result-title-row">
              <span class="search-result-title">${this.escapeHtml(res.title)}</span>
              ${catBadge}
            </div>
            <span class="search-result-url">${this.escapeHtml(res.url || res.query || '')}</span>
          </div>
        </div>
      `;
    }).join('');

    this.resultsDropdown.classList.add('active');
    this.attachDropdownListeners();
  }

  attachDropdownListeners() {
    if (!this.resultsDropdown) return;

    // Row clicks
    this.resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const idx = parseInt(item.dataset.index, 10);
        const openInNewTab = e.ctrlKey || e.metaKey || e.button === 1;
        this.navigateToResult(idx, openInNewTab);
      });

      item.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Middle click
          const idx = parseInt(item.dataset.index, 10);
          this.navigateToResult(idx, true);
        }
      });
    });
  }

  hideResults() {
    if (this.resultsDropdown) {
      this.resultsDropdown.classList.remove('active');
    }
    this.clearGhostAutocomplete();
    this.selectedIndex = -1;
  }

  /* ============================================================
     KEYBOARD NAVIGATION & SUBMISSION
     ============================================================ */
  handleInputKeydown(e) {
    if (e.key === 'Tab') {
      // 1. If ghost autocomplete is active, accept on Tab!
      if (this.ghostText && this.currentCompletion) {
        e.preventDefault();
        this.acceptGhostAutocomplete();
        return;
      }

      // 2. Otherwise navigate through results dropdown
      if (this.results.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
        } else {
          this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
        }
        this.updateSelectionHighlight();
      }
    } else if (e.key === 'ArrowRight') {
      // Accept ghost completion if caret is at the end of input
      if (this.ghostText && this.currentCompletion && this.searchInput) {
        if (this.searchInput.selectionStart === this.searchInput.value.length) {
          e.preventDefault();
          this.acceptGhostAutocomplete();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.results.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
        this.updateSelectionHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.results.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
        this.updateSelectionHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const openInNewTab = e.ctrlKey || e.metaKey;
      this.submitCurrentQuery(openInNewTab);
    }
  }

  updateSelectionHighlight() {
    if (!this.resultsDropdown) return;
    const items = this.resultsDropdown.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  openUrl(targetUrl, openInNewTab = false) {
    if (!targetUrl) return;
    if (openInNewTab) {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        try {
          chrome.tabs.getCurrent((currentTab) => {
            if (currentTab && typeof currentTab.index === 'number') {
              chrome.tabs.create({ url: targetUrl, index: currentTab.index + 1, active: true });
            } else {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const idx = (tabs && tabs[0] && typeof tabs[0].index === 'number') ? tabs[0].index + 1 : undefined;
                chrome.tabs.create({ url: targetUrl, index: idx, active: true });
              });
            }
          });
          return;
        } catch {}
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  }

  submitCurrentQuery(openInNewTab = false) {
    if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
      this.navigateToResult(this.selectedIndex, openInNewTab);
      return;
    }

    const query = (this.searchInput ? this.searchInput.value : '').trim();
    if (!query) return;

    // Check direct URL
    if (this.isDirectUrl(query)) {
      const url = this.formatDirectUrl(query);
      this.openUrl(url, openInNewTab);
      return;
    }

    // Default to Google search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    this.openUrl(searchUrl, openInNewTab);
  }

  navigateToResult(index, openInNewTab = false) {
    const item = this.results[index];
    if (!item) return;

    if (item.type === 'calculator') {
      try {
        navigator.clipboard.writeText(item.value);
        if (this.searchInput) {
          this.searchInput.value = item.value;
          this.searchInput.select();
        }
        item.title = `✓ Copied: ${item.value}`;
        this.renderResults();
      } catch (e) {
        console.warn('Clipboard copy failed:', e);
      }
      return;
    }

    if (typeof item.action === 'function') {
      item.action();
      this.closeResults();
      return;
    }

    if (item.url) {
      this.openUrl(item.url, openInNewTab);
    }
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}

window.commandPalette = new CommandPalette();
