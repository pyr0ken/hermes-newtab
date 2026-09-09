// Bookmarks & Speed Dial Engine with Two-Layer Architecture

class BookmarksEngine {
  constructor() {
    this.bookmarks = [];
    this.pinnedBookmarks = [];
    this.folders = new Map(); // folderName -> [bookmarks]
    this.currentFolder = 'all';
    this.viewMode = localStorage.getItem('hermes_bookmark_view') || 'grid'; // 'grid' | 'list'

    this.pinnedGridEl = document.getElementById('pinned-grid');
    this.gridElement = document.getElementById('bookmarks-grid');
    this.tabsElement = document.getElementById('category-tabs');
    this.folderTitleEl = document.getElementById('current-folder-title');
    this.wrapperEl = document.getElementById('folder-bookmarks-wrapper');

    this.btnViewGrid = document.getElementById('btn-view-grid');
    this.btnViewList = document.getElementById('btn-view-list');
    this.carouselPrev = document.getElementById('carousel-prev');
    this.carouselNext = document.getElementById('carousel-next');
  }

  async init() {
    await this.loadBookmarks();
    await this.loadPinnedSites();
    this.renderCategoryTabs();
    this.updateViewModeButtons();
    this.renderFolderView();
    this.setupEventListeners();
  }

  async loadBookmarks() {
    this.bookmarks = [];
    this.folders.clear();

    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
      try {
        const tree = await chrome.bookmarks.getTree();
        this.parseBookmarkTree(tree);
        
        // If folders exist, select the first rich folder by default instead of 'all'
        const folderKeys = Array.from(this.folders.keys());
        if (folderKeys.length > 0 && this.currentFolder === 'all') {
          // Find first folder with > 0 items
          this.currentFolder = folderKeys[0];
        }
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
          title: (node.title || '').trim() || 'Untitled',
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
        const catName = (node.title && !['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks'].includes(node.title))
          ? node.title 
          : currentCategory;
        this.parseBookmarkTree(node.children, catName);
      }
    }
  }

  async loadPinnedSites() {
    this.pinnedBookmarks = [];

    // Check custom saved pins first
    try {
      const saved = localStorage.getItem('hermes_custom_pinned');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.pinnedBookmarks = parsed;
          this.renderPinnedGrid();
          return;
        }
      }
    } catch {}

    // Option A: Try Chrome topSites API
    if (typeof chrome !== 'undefined' && chrome.topSites && chrome.topSites.get) {
      try {
        const topSites = await new Promise(resolve => chrome.topSites.get(resolve));
        if (topSites && topSites.length > 0) {
          this.pinnedBookmarks = topSites.slice(0, 10).map(s => ({
            title: s.title || this.extractDomain(s.url),
            url: s.url,
            domain: this.extractDomain(s.url),
            favicon: this.getFaviconUrl(s.url)
          }));
          this.savePinnedSites();
          this.renderPinnedGrid();
          return;
        }
      } catch (e) {
        console.warn('topSites API unavailable:', e);
      }
    }

    // Option B: Fallback to top curated favorites from bookmarks or defaults
    const topKeywords = ['chatgpt', 'claude', 'github', 'perplexity', 'huggingface', 'youtube', 'x.com', 'obsidian', 'linear', 'figma'];
    const found = [];

    for (const kw of topKeywords) {
      const match = this.bookmarks.find(b => b.url.toLowerCase().includes(kw) || b.title.toLowerCase().includes(kw));
      if (match && !found.some(f => f.url === match.url)) {
        found.push(match);
      }
    }

    if (found.length < 6) {
      for (const b of this.bookmarks) {
        if (!found.some(f => f.url === b.url)) {
          found.push(b);
          if (found.length >= 8) break;
        }
      }
    }

    this.pinnedBookmarks = found.slice(0, 10);
    this.savePinnedSites();
    this.renderPinnedGrid();
  }

  savePinnedSites() {
    try {
      localStorage.setItem('hermes_custom_pinned', JSON.stringify(this.pinnedBookmarks));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ hermes_custom_pinned: this.pinnedBookmarks });
      }
    } catch {}
  }

  renderPinnedGrid() {
    if (!this.pinnedGridEl) return;

    const cardsHtml = this.pinnedBookmarks.map((bm, idx) => `
      <a 
        href="${bm.url}" 
        class="pinned-card" 
        title="${this.escapeHtml(bm.title)} (${bm.url})" 
        draggable="true" 
        data-pinned-index="${idx}"
        data-url="${bm.url}"
      >
        <button class="btn-unpin" title="Remove from Quick Access" data-unpin-index="${idx}">&times;</button>
        <img 
          src="${bm.favicon}" 
          class="pinned-favicon" 
          alt="${this.escapeHtml(bm.title)}"
          onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'" 
        />
        <span class="pinned-title">${this.escapeHtml(bm.title)}</span>
      </a>
    `).join('');

    const addCardHtml = `
      <div class="add-pin-card" id="btn-add-pin" title="Add custom link to Quick Access">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
    `;

    this.pinnedGridEl.innerHTML = cardsHtml + addCardHtml;
    this.setupPinnedEvents();
  }

  renderCategoryTabs() {
    if (!this.tabsElement) return;

    const categories = ['all', ...Array.from(this.folders.keys())];

    this.tabsElement.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'All Bookmarks' : cat;
      const count = cat === 'all' ? this.bookmarks.length : (this.folders.get(cat) || []).length;
      const activeClass = this.currentFolder === cat ? 'active' : '';
      return `
        <button class="category-tab ${activeClass}" data-folder="${this.escapeHtml(cat)}">
          <span>${this.escapeHtml(label)}</span>
          <span class="tab-badge">${count}</span>
        </button>
      `;
    }).join('');
  }

  renderFolderView() {
    if (!this.gridElement) return;

    const items = this.currentFolder === 'all' 
      ? this.bookmarks 
      : (this.folders.get(this.currentFolder) || []);

    if (this.folderTitleEl) {
      const folderLabel = this.currentFolder === 'all' ? 'All Bookmarks' : this.currentFolder;
      this.folderTitleEl.textContent = `${folderLabel} (${items.length})`;
    }

    if (items.length === 0) {
      this.gridElement.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.82rem;">
          No bookmarks found in this category.
        </div>
      `;
      return;
    }

    if (this.viewMode === 'list') {
      this.gridElement.className = 'bookmarks-list';
      this.gridElement.innerHTML = items.map(bm => `
        <a 
          href="${bm.url}" 
          class="bookmark-list-row" 
          title="${this.escapeHtml(bm.title)} (${bm.url}) — Drag to Quick Access"
          draggable="true"
          data-bm-title="${this.escapeHtml(bm.title)}"
          data-bm-url="${bm.url}"
          data-bm-domain="${this.escapeHtml(bm.domain)}"
          data-bm-favicon="${bm.favicon}"
        >
          <div class="bookmark-list-left">
            <img 
              src="${bm.favicon}" 
              class="bookmark-favicon" 
              alt=""
              onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'" 
            />
            <span class="bookmark-list-name">${this.escapeHtml(bm.title)}</span>
          </div>
          <div class="bookmark-list-right">
            <span class="bookmark-list-domain">${this.escapeHtml(bm.domain)}</span>
          </div>
        </a>
      `).join('');
    } else {
      // Default: Responsive Grid
      this.gridElement.className = 'bookmarks-grid';
      this.gridElement.innerHTML = items.map(bm => `
        <a 
          href="${bm.url}" 
          class="bookmark-card" 
          title="${this.escapeHtml(bm.title)} (${bm.url}) — Drag to Quick Access"
          draggable="true"
          data-bm-title="${this.escapeHtml(bm.title)}"
          data-bm-url="${bm.url}"
          data-bm-domain="${this.escapeHtml(bm.domain)}"
          data-bm-favicon="${bm.favicon}"
        >
          <img 
            src="${bm.favicon}" 
            class="bookmark-favicon" 
            alt=""
            onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2360a5fa\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'" 
          />
          <div class="bookmark-details">
            <span class="bookmark-name">${this.escapeHtml(bm.title)}</span>
            <span class="bookmark-domain">${this.escapeHtml(bm.domain)}</span>
          </div>
        </a>
      `).join('');
    }

    this.setupFolderDragEvents();
  }

  setupPinnedEvents() {
    // Unpin button clicks
    if (this.pinnedGridEl) {
      this.pinnedGridEl.querySelectorAll('.btn-unpin').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(btn.dataset.unpinIndex, 10);
          if (!isNaN(idx) && idx >= 0 && idx < this.pinnedBookmarks.length) {
            this.pinnedBookmarks.splice(idx, 1);
            this.savePinnedSites();
            this.renderPinnedGrid();
          }
        });
      });

      // Add (+) button click
      const addBtn = document.getElementById('btn-add-pin');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const rawUrl = prompt('Enter Website URL (e.g. https://github.com):');
          if (!rawUrl) return;
          const formattedUrl = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : 'https://' + rawUrl.trim();
          const domain = this.extractDomain(formattedUrl);
          const rawTitle = prompt('Enter Website Title:', domain) || domain;

          this.pinnedBookmarks.push({
            title: rawTitle.trim(),
            url: formattedUrl,
            domain: domain,
            favicon: this.getFaviconUrl(formattedUrl)
          });
          this.savePinnedSites();
          this.renderPinnedGrid();
        });
      }

      // Drag and drop for pinned cards (reordering & receiving from folder)
      this.pinnedGridEl.querySelectorAll('.pinned-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
          const idx = parseInt(card.dataset.pinnedIndex, 10);
          card.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'pinned-reorder',
            sourceIndex: idx,
            data: this.pinnedBookmarks[idx]
          }));
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
          document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('drag-over');

          const targetIndex = parseInt(card.dataset.pinnedIndex, 10);
          try {
            const payload = JSON.parse(e.dataTransfer.getData('application/json'));
            if (payload.type === 'pinned-reorder') {
              const sourceIndex = payload.sourceIndex;
              if (sourceIndex !== targetIndex) {
                const [moved] = this.pinnedBookmarks.splice(sourceIndex, 1);
                this.pinnedBookmarks.splice(targetIndex, 0, moved);
                this.savePinnedSites();
                this.renderPinnedGrid();
              }
            } else if (payload.type === 'folder-bookmark') {
              const item = payload.data;
              // If already exists in pinned, move it
              const existingIdx = this.pinnedBookmarks.findIndex(b => b.url === item.url);
              if (existingIdx >= 0) {
                const [moved] = this.pinnedBookmarks.splice(existingIdx, 1);
                this.pinnedBookmarks.splice(targetIndex, 0, moved);
              } else {
                this.pinnedBookmarks.splice(targetIndex, 0, item);
              }
              this.savePinnedSites();
              this.renderPinnedGrid();
            }
          } catch (err) {
            console.warn('Drop failed:', err);
          }
        });
      });

      // Allow dropping into the general pinned grid area (appends to end)
      this.pinnedGridEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      this.pinnedGridEl.addEventListener('drop', (e) => {
        if (e.target.closest('.pinned-card')) return; // Handled by individual card
        e.preventDefault();
        try {
          const payload = JSON.parse(e.dataTransfer.getData('application/json'));
          if (payload.type === 'folder-bookmark') {
            const item = payload.data;
            if (!this.pinnedBookmarks.some(b => b.url === item.url)) {
              this.pinnedBookmarks.push(item);
              this.savePinnedSites();
              this.renderPinnedGrid();
            }
          }
        } catch {}
      });
    }
  }

  setupFolderDragEvents() {
    if (!this.gridElement) return;

    this.gridElement.querySelectorAll('.bookmark-card, .bookmark-list-row').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        el.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'folder-bookmark',
          data: {
            title: el.dataset.bmTitle || 'Bookmark',
            url: el.dataset.bmUrl,
            domain: el.dataset.bmDomain || this.extractDomain(el.dataset.bmUrl),
            favicon: el.dataset.bmFavicon || this.getFaviconUrl(el.dataset.bmUrl)
          }
        }));
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('is-dragging');
        document.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'));
      });
    });
  }

  updateViewModeButtons() {
    if (this.btnViewGrid && this.btnViewList) {
      if (this.viewMode === 'grid') {
        this.btnViewGrid.classList.add('active');
        this.btnViewList.classList.remove('active');
      } else {
        this.btnViewGrid.classList.remove('active');
        this.btnViewList.classList.add('active');
      }
    }
  }

  setupEventListeners() {
    // Tab switching
    if (this.tabsElement) {
      this.tabsElement.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-tab');
        if (!btn) return;

        this.currentFolder = btn.dataset.folder;
        this.tabsElement.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Scroll active tab into view in the carousel
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        this.renderFolderView();
      });
    }

    // Carousel buttons
    if (this.carouselPrev && this.tabsElement) {
      this.carouselPrev.addEventListener('click', () => {
        this.tabsElement.scrollBy({ left: -240, behavior: 'smooth' });
      });
    }

    if (this.carouselNext && this.tabsElement) {
      this.carouselNext.addEventListener('click', () => {
        this.tabsElement.scrollBy({ left: 240, behavior: 'smooth' });
      });
    }

    // View toggles
    if (this.btnViewGrid) {
      this.btnViewGrid.addEventListener('click', () => {
        this.viewMode = 'grid';
        localStorage.setItem('hermes_bookmark_view', 'grid');
        this.updateViewModeButtons();
        this.renderFolderView();
      });
    }

    if (this.btnViewList) {
      this.btnViewList.addEventListener('click', () => {
        this.viewMode = 'list';
        localStorage.setItem('hermes_bookmark_view', 'list');
        this.updateViewModeButtons();
        this.renderFolderView();
      });
    }
  }

  normalizeText(str) {
    if (!str) return '';
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    let s = str.toString();
    for (let i = 0; i < 10; i++) {
      s = s.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
    }
    return s
      .replaceAll('ي', 'ی')
      .replaceAll('ك', 'ک')
      .replaceAll('ة', 'ه')
      .replaceAll('ۀ', 'ه')
      .replaceAll('آ', 'ا')
      .replaceAll('أ', 'ا')
      .replaceAll('إ', 'ا')
      .replaceAll('\u200c', ' ')
      .replace(/[\u064B-\u065F]/g, '')
      .toLowerCase();
  }

  tokenize(str) {
    const norm = this.normalizeText(str);
    return norm.split(/[\s\.\-_/:\+]+/).filter(Boolean);
  }

  scoreMatch(query, item) {
    const qNorm = this.normalizeText(query).trim();
    if (!qNorm) return 0;
    
    const qTokens = this.tokenize(query);
    const tTitleTokens = this.tokenize(item.title);
    const tDomainTokens = this.tokenize(item.domain);
    const tCategoryTokens = this.tokenize(item.category || '');
    const allTokens = [...tTitleTokens, ...tDomainTokens, ...tCategoryTokens];

    const titleNorm = this.normalizeText(item.title);
    const domainNorm = this.normalizeText(item.domain);
    const urlNorm = this.normalizeText(item.url);

    // Exact full match
    if (titleNorm === qNorm) return 1000;
    if (domainNorm === qNorm) return 800;

    // Title starts with full query
    if (titleNorm.startsWith(qNorm)) return 600;

    // Check query tokens
    let tokenScore = 0;
    let allMatched = true;

    for (const qTok of qTokens) {
      let bestForTok = 0;
      for (const tTok of allTokens) {
        if (tTok === qTok) {
          bestForTok = Math.max(bestForTok, 100);
        } else if (tTok.startsWith(qTok)) {
          bestForTok = Math.max(bestForTok, 70);
        } else if (tTok.includes(qTok)) {
          bestForTok = Math.max(bestForTok, 40);
        }
      }
      if (bestForTok === 0) {
        if (titleNorm.includes(qTok) || urlNorm.includes(qTok)) {
          bestForTok = 25;
        } else {
          allMatched = false;
          break;
        }
      }
      tokenScore += bestForTok;
    }

    if (!allMatched) return 0;
    return tokenScore;
  }

  searchBookmarks(query) {
    if (!query) return [];
    
    const scored = [];
    for (const bm of this.bookmarks) {
      const score = this.scoreMatch(query, bm);
      if (score > 0) {
        scored.push({ ...bm, _score: score });
      }
    }

    // Sort by descending score
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, 12);
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
