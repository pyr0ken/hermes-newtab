// Raycast-Style Command Palette & Omni-Search

class CommandPalette {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.resultsDropdown = document.getElementById('search-results');
    this.quickTags = document.querySelectorAll('.quick-tag');
    this.results = [];
    this.selectedIndex = -1;

    this.searchEngines = {
      '/g': { name: 'Google Search', url: 'https://www.google.com/search?q=' },
      '/gh': { name: 'GitHub Search', url: 'https://github.com/search?q=' },
      '/x': { name: 'X / Twitter Search', url: 'https://x.com/search?q=' },
      '/p': { name: 'Perplexity AI', url: 'https://www.perplexity.ai/search?q=' },
      '/yt': { name: 'YouTube Search', url: 'https://www.youtube.com/results?search_query=' },
      '/w': { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' }
    };
  }

  init() {
    this.setupKeyboardShortcuts();
    this.setupInputListener();
    this.setupQuickTags();
    setTimeout(() => this.focusSearch(), 50);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K or Slash (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.focusSearch();
      } else if (e.key === '/' && document.activeElement !== this.searchInput && document.activeElement.tagName !== 'TEXTAREA') {
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

  focusSearch() {
    if (!this.searchInput) return;
    this.searchInput.focus();
    this.searchInput.select();
  }

  clearAndClose() {
    if (!this.searchInput) return;
    this.searchInput.value = '';
    this.searchInput.blur();
    this.hideResults();
  }

  setupQuickTags() {
    this.quickTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const prefix = tag.dataset.prefix;
        if (!prefix || !this.searchInput) return;
        this.searchInput.value = prefix;
        this.searchInput.focus();
        this.onQueryChange(prefix);
      });
    });
  }

  setupInputListener() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      this.onQueryChange(e.target.value);
    });
  }

  tryEvaluateMath(expr) {
    if (!expr) return null;
    const sanitized = expr
      .replace(/\^/g, '**')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '')
      .trim();

    // Check if expression consists only of digits, basic math symbols and parentheses
    if (!/^[\d\s\+\-\*\/\(\)\.\%]+$/.test(sanitized)) return null;
    // Must contain at least one operator
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

  onQueryChange(rawQuery) {
    const query = rawQuery.trim();
    if (!query) {
      this.hideResults();
      return;
    }

    // Check for direct URL / domain input (e.g. git.ir, github.com, http://localhost:3000)
    if (this.isDirectUrl(query)) {
      const targetUrl = this.formatDirectUrl(query);
      const displayHost = targetUrl.replace(/^https?:\/\//i, '');
      const matchedBookmarks = window.bookmarksEngine 
        ? window.bookmarksEngine.searchBookmarks(query) 
        : [];

      this.results = [
        {
          type: 'url',
          title: `Open https://${displayHost}`,
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

    // Check for math calculator expression (e.g. 256 * 1024)
    const mathResult = this.tryEvaluateMath(query);
    if (mathResult !== null) {
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

    // Explicit Bookmarks only filter: /b or /b query
    if (query.startsWith('/b ') || query === '/b') {
      const term = query.replace(/^\/b\s*/, '').trim();
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
      this.selectedIndex = 0;
      this.renderResults();
      return;
    }

    // Check for prefix shortcuts (e.g. /g search term, /gh repo)
    for (const [prefix, engine] of Object.entries(this.searchEngines)) {
      if (query.startsWith(prefix + ' ') || query === prefix || query.startsWith(prefix)) {
        const term = query.slice(prefix.length).trim();
        this.results = [{
          type: 'engine',
          title: `Search with ${engine.name}: "${term || '...'}"`,
          url: engine.url + encodeURIComponent(term),
          icon: 'search'
        }];
        this.selectedIndex = 0;
        this.renderResults();
        return;
      }
    }

    // Search inside bookmarks with intelligent multi-token fuzzy matching
    const matchedBookmarks = window.bookmarksEngine 
      ? window.bookmarksEngine.searchBookmarks(query) 
      : [];

    const defaultSearch = {
      type: 'engine',
      title: `Search Google for "${query}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      icon: 'search'
    };

    this.results = [
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

  renderResults() {
    if (!this.resultsDropdown) return;

    if (this.results.length === 0) {
      this.hideResults();
      return;
    }

    this.resultsDropdown.innerHTML = this.results.map((res, idx) => {
      const isSelected = idx === this.selectedIndex ? 'selected' : '';
      let iconHtml;
      
      if (res.type === 'calculator') {
        iconHtml = `<div class="search-result-icon" style="display:flex;align-items:center;justify-content:center;color:var(--status-online);">${ICONS.calculator || ICONS.search}</div>`;
      } else if (res.favicon) {
        iconHtml = `<img src="${res.favicon}" class="search-result-icon" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'">`;
      } else {
        iconHtml = `<div class="search-result-icon" style="display:flex;align-items:center;justify-content:center;color:var(--accent-blue);">${ICONS.search}</div>`;
      }

      const catBadge = res.category 
        ? `<span style="font-size: 0.65rem; padding: 0.1rem 0.4rem; background: rgba(59, 130, 246, 0.15); border-radius: 4px; color: var(--accent-blue); margin-left: 0.5rem; font-family: var(--font-mono);">${this.escapeHtml(res.category)}</span>` 
        : '';

      return `
        <div class="search-result-item ${isSelected}" data-index="${idx}">
          ${iconHtml}
          <div class="search-result-info">
            <div style="display: flex; align-items: center;">
              <span class="search-result-title">${this.escapeHtml(res.title)}</span>
              ${catBadge}
            </div>
            <span class="search-result-url">${this.escapeHtml(res.url)}</span>
          </div>
        </div>
      `;
    }).join('');

    this.resultsDropdown.classList.add('active');

    // Attach click listeners to rows
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
    this.results = [];
    this.selectedIndex = -1;
  }

  handleInputKeydown(e) {
    if (e.key === 'ArrowDown') {
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

    const query = (this.searchInput.value || '').trim();
    if (!query) return;

    // Check if query is direct URL / domain
    if (this.isDirectUrl(query)) {
      this.openUrl(this.formatDirectUrl(query), openInNewTab);
      return;
    }

    // Fallback to Google Search
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
        this.results[index].title = `✓ Copied: ${item.value}`;
        this.renderResults();
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
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
