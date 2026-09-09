// Bookmarks & Speed Dial Engine

class BookmarksEngine {
  constructor() {
    this.bookmarks = [];
    this.folders = new Map(); // folderName -> [bookmarks]
    this.currentFolder = 'all';
    this.gridElement = document.getElementById('bookmarks-grid');
    this.tabsElement = document.getElementById('category-tabs');
  }

  async init() {
    await this.loadBookmarks();
    this.renderCategoryTabs();
    this.renderGrid();
    this.setupEventListeners();
  }

  async loadBookmarks() {
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
      try {
        const tree = await chrome.bookmarks.getTree();
        this.parseBookmarkTree(tree);
        return;
      } catch (err) {
        console.warn('Failed to load chrome.bookmarks:', err);
      }
    }

    // Fallback default bookmarks for testing & preview mode
    this.loadFallbackBookmarks();
  }

  parseBookmarkTree(nodes, currentCategory = 'General') {
    for (const node of nodes) {
      if (node.url) {
        const item = {
          id: node.id,
          title: node.title || 'Untitled',
          url: node.url,
          category: currentCategory,
          domain: this.extractDomain(node.url),
          favicon: this.getFaviconUrl(node.url)
        };
        this.bookmarks.push(item);

        if (!this.folders.has(currentCategory)) {
          this.folders.set(currentCategory, []);
        }
        this.folders.get(currentCategory).push(item);
      }

      if (node.children && node.children.length > 0) {
        // Skip root folders like "Bookmarks bar" name, use actual subfolder titles
        const catName = (node.title && !['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks'].includes(node.title))
          ? node.title 
          : currentCategory;
        this.parseBookmarkTree(node.children, catName);
      }
    }
  }

  loadFallbackBookmarks() {
    const defaults = [
      { title: 'GitHub', url: 'https://github.com', category: 'Dev' },
      { title: 'Nous Research', url: 'https://nousresearch.com', category: 'ai' },
      { title: 'Hermes Docs', url: 'https://hermes-agent.nousresearch.com/docs', category: 'ai' },
      { title: 'ChatGPT', url: 'https://chatgpt.com', category: 'ai' },
      { title: 'Claude', url: 'https://claude.ai', category: 'ai' },
      { title: 'Perplexity', url: 'https://perplexity.ai', category: 'ai' },
      { title: 'arXiv CS/AI', url: 'https://arxiv.org', category: 'math' },
      { title: 'Obsidian Notes', url: 'app://obsidian', category: 'Productivity' },
      { title: 'X / Twitter', url: 'https://x.com', category: 'Social' },
      { title: 'Arch Linux Wiki', url: 'https://wiki.archlinux.org', category: 'Dev' }
    ];

    this.bookmarks = [];
    this.folders.clear();

    for (const d of defaults) {
      const item = {
        id: String(Math.random()),
        title: d.title,
        url: d.url,
        category: d.category,
        domain: this.extractDomain(d.url),
        favicon: this.getFaviconUrl(d.url)
      };
      this.bookmarks.push(item);

      if (!this.folders.has(d.category)) {
        this.folders.set(d.category, []);
      }
      this.folders.get(d.category).push(item);
    }
  }

  extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  getFaviconUrl(pageUrl) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        const urlObj = new URL(chrome.runtime.getURL('/_favicon/'));
        urlObj.searchParams.set('pageUrl', pageUrl);
        urlObj.searchParams.set('size', '32');
        return urlObj.toString();
      }
    } catch {
      // Chrome extension favicon API not active, use google favicon resolver
    }

    const domain = this.extractDomain(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }

  renderCategoryTabs() {
    if (!this.tabsElement) return;

    const categories = ['all', ...Array.from(this.folders.keys())];
    
    // Build tabs HTML
    this.tabsElement.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'All' : cat;
      const count = cat === 'all' ? this.bookmarks.length : (this.folders.get(cat) || []).length;
      const activeClass = this.currentFolder === cat ? 'active' : '';
      return `
        <button class="category-tab ${activeClass}" data-folder="${cat}">
          ${label} <span style="opacity: 0.5; font-size: 0.7em;">(${count})</span>
        </button>
      `;
    }).join('');
  }

  renderGrid() {
    if (!this.gridElement) return;

    const items = this.currentFolder === 'all' 
      ? this.bookmarks 
      : (this.folders.get(this.currentFolder) || []);

    if (items.length === 0) {
      this.gridElement.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem;">
          No bookmarks found in this category.
        </div>
      `;
      return;
    }

    this.gridElement.innerHTML = items.map(bm => `
      <a href="${bm.url}" class="bookmark-card" title="${bm.title} (${bm.url})">
        <img 
          src="${bm.favicon}" 
          class="bookmark-favicon" 
          alt="${bm.title}" 
          onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'" 
        />
        <div class="bookmark-details">
          <span class="bookmark-name">${this.escapeHtml(bm.title)}</span>
          <span class="bookmark-domain">${this.escapeHtml(bm.domain)}</span>
        </div>
      </a>
    `).join('');
  }

  setupEventListeners() {
    if (this.tabsElement) {
      this.tabsElement.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-tab');
        if (!btn) return;

        this.currentFolder = btn.dataset.folder;
        this.tabsElement.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderGrid();
      });
    }
  }

  searchBookmarks(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return this.bookmarks.filter(bm => 
      bm.title.toLowerCase().includes(q) || 
      bm.url.toLowerCase().includes(q) ||
      bm.domain.toLowerCase().includes(q)
    ).slice(0, 10);
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

window.bookmarksEngine = new BookmarksEngine();
