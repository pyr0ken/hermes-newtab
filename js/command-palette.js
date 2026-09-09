// Raycast-Style Command Palette & Omni-Search

class CommandPalette {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.resultsDropdown = document.getElementById('search-results');
    this.quickTags = document.querySelectorAll('.quick-tag');
    this.results = [];
    this.selectedIndex = -1;

    this.searchEngines = {
      'g/': { name: 'Google Search', url: 'https://www.google.com/search?q=' },
      'gh/': { name: 'GitHub Search', url: 'https://github.com/search?q=' },
      'x/': { name: 'X / Twitter Search', url: 'https://x.com/search?q=' },
      'p/': { name: 'Perplexity AI', url: 'https://www.perplexity.ai/search?q=' },
      'yt/': { name: 'YouTube Search', url: 'https://www.youtube.com/results?search_query=' },
      'w/': { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' }
    };
  }

  init() {
    this.setupKeyboardShortcuts();
    this.setupInputListener();
    this.setupQuickTags();
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

  onQueryChange(rawQuery) {
    const query = rawQuery.trim();
    if (!query) {
      this.hideResults();
      return;
    }

    // Check for prefix shortcuts (e.g. g/ search term)
    for (const [prefix, engine] of Object.entries(this.searchEngines)) {
      if (query.startsWith(prefix)) {
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

    // Search inside bookmarks
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
      const iconHtml = res.favicon
        ? `<img src="${res.favicon}" class="search-result-icon" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'">`
        : `<div class="search-result-icon" style="display:flex;align-items:center;justify-content:center;color:var(--accent-blue);">${ICONS.search}</div>`;

      return `
        <div class="search-result-item ${isSelected}" data-index="${idx}">
          ${iconHtml}
          <div class="search-result-info">
            <span class="search-result-title">${this.escapeHtml(res.title)}</span>
            <span class="search-result-url">${this.escapeHtml(res.url)}</span>
          </div>
        </div>
      `;
    }).join('');

    this.resultsDropdown.classList.add('active');

    // Attach click listeners to rows
    this.resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index, 10);
        this.navigateToResult(idx);
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
      this.submitCurrentQuery();
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

  submitCurrentQuery() {
    if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
      this.navigateToResult(this.selectedIndex);
      return;
    }

    const query = (this.searchInput.value || '').trim();
    if (!query) return;

    // Check if query is URL
    if (/^https?:\/\//i.test(query)) {
      window.location.href = query;
      return;
    }
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(query)) {
      window.location.href = 'https://' + query;
      return;
    }

    // Fallback to Google Search
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  navigateToResult(index) {
    const item = this.results[index];
    if (item && item.url) {
      window.location.href = item.url;
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
