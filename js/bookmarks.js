// Bookmarks Explorer Engine with Drag & Drop to Folders

class BookmarksEngine {
  constructor() {
    this.bookmarks = [];
    this.folders = new Map(); // folderName -> [bookmarks]
    this.folderNodeIds = new Map(); // folderName -> chromeNodeId
    this.currentFolder = localStorage.getItem('hermes_last_folder') || 'all';
    this.viewMode = localStorage.getItem('hermes_bookmark_view') || 'grid'; // 'grid' | 'list'
    this.isDragging = false;
    this.activeDragPayload = null;

    this.refreshElements();
  }

  refreshElements() {
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
    this.refreshElements();
    await this.loadBookmarks();
    this.renderCategoryTabs();
    this.updateViewModeButtons();
    this.renderFolderView();
    this.setupEventListeners();
  }

  async loadBookmarks() {
    this.bookmarks = [];
    this.folders.clear();
    this.folderNodeIds.clear();

    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
      try {
        const tree = await new Promise((resolve) => {
          chrome.bookmarks.getTree((res) => resolve(res));
        });
        if (tree && Array.isArray(tree) && tree.length > 0) {
          this.parseBookmarkTree(tree);
          if (this.currentFolder !== 'all' && !this.folders.has(this.currentFolder)) {
            this.currentFolder = 'all';
          }
          return;
        }
      } catch (err) {
        console.warn('Failed to load chrome.bookmarks:', err);
      }
    }

    // Fallback default bookmarks for testing & preview mode
    this.loadFallbackBookmarks();
  }

  parseBookmarkTree(nodes, currentCategory = 'General', currentFolderNodeId = '1') {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      if (node.url) {
        const item = {
          id: node.id || String(Math.random()),
          title: (node.title || '').trim() || 'Untitled',
          url: node.url,
          category: currentCategory,
          parentId: node.parentId || currentFolderNodeId,
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
        const isRootIgnored = ['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks', 'نوار نشانکها', 'سایر نشانکها', 'نشانکهای تلفن همراه'].includes(node.title);
        const catName = (node.title && !isRootIgnored)
          ? node.title 
          : currentCategory;

        if (node.title && !isRootIgnored) {
          this.folderNodeIds.set(node.title, node.id);
        }

        this.parseBookmarkTree(node.children, catName, node.id);
      }
    }
  }

  loadFallbackBookmarks() {
    const defaults = [
      { id: '1', title: 'ChatGPT', url: 'https://chatgpt.com', category: 'Chatbots' },
      { id: '2', title: 'Claude AI', url: 'https://claude.ai', category: 'Chatbots' },
      { id: '3', title: 'Perplexity AI', url: 'https://perplexity.ai', category: 'Chatbots' },
      { id: '4', title: 'DeepSeek', url: 'https://chat.deepseek.com', category: 'Chatbots' },
      { id: '5', title: 'GitHub', url: 'https://github.com', category: 'Dev' },
      { id: '6', title: 'Hermes Agent Docs', url: 'https://hermes-agent.nousresearch.com/docs', category: 'Dev' },
      { id: '7', title: 'Arch Linux Wiki', url: 'https://wiki.archlinux.org', category: 'Dev' },
      { id: '8', title: 'Hugging Face', url: 'https://huggingface.co', category: 'Google AI' },
      { id: '9', title: 'arXiv AI/CS', url: 'https://arxiv.org', category: 'Courses & Data' },
      { id: '10', title: 'Figma', url: 'https://figma.com', category: 'Image & Creative' }
    ];

    for (const d of defaults) {
      const item = {
        id: d.id,
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
      return url || '';
    }
  }

  getFaviconUrl(pageUrl) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
      }
    } catch {}

    const domain = this.extractDomain(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  renderCategoryTabs() {
    this.refreshElements();
    if (!this.tabsElement) return;

    const categories = ['all', ...Array.from(this.folders.keys())];

    this.tabsElement.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'All Bookmarks' : cat;
      const count = cat === 'all' ? this.bookmarks.length : (this.folders.get(cat) || []).length;
      const activeClass = this.currentFolder === cat ? 'active' : '';
      return `
        <button class="category-tab ${activeClass}" data-folder="${this.escapeHtml(cat)}" title="Click to view or drop bookmarks here">
          <span>${this.escapeHtml(label)}</span>
          <span class="tab-badge">${count}</span>
        </button>
      `;
    }).join('');

    // Scroll active tab into view
    const activeBtn = this.tabsElement.querySelector('.category-tab.active');
    if (activeBtn) {
      setTimeout(() => {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }

    this.setupCategoryDropEvents();
  }

  renderFolderView() {
    this.refreshElements();
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
        <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.82rem;">
          No bookmarks found in this category.
        </div>
      `;
      return;
    }

    if (this.viewMode === 'list') {
      this.gridElement.className = 'bookmarks-list';
      this.gridElement.innerHTML = items.map((bm, idx) => `
        <div 
          class="bookmark-list-row" 
          title="${this.escapeHtml(bm.title)} (${bm.url}) — Drag to Category tabs to organize"
          draggable="true"
          data-bm-index="${idx}"
          data-bm-id="${bm.id}"
          data-bm-title="${this.escapeHtml(bm.title)}"
          data-bm-url="${bm.url}"
          data-bm-domain="${this.escapeHtml(bm.domain)}"
          data-bm-favicon="${bm.favicon}"
          data-bm-category="${this.escapeHtml(bm.category)}"
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
        </div>
      `).join('');
    } else {
      // Default: Responsive Grid
      this.gridElement.className = 'bookmarks-grid';
      this.gridElement.innerHTML = items.map((bm, idx) => `
        <div 
          class="bookmark-card" 
          title="${this.escapeHtml(bm.title)} (${bm.url}) — Drag to Category tabs to organize"
          draggable="true"
          data-bm-index="${idx}"
          data-bm-id="${bm.id}"
          data-bm-title="${this.escapeHtml(bm.title)}"
          data-bm-url="${bm.url}"
          data-bm-domain="${this.escapeHtml(bm.domain)}"
          data-bm-favicon="${bm.favicon}"
          data-bm-category="${this.escapeHtml(bm.category)}"
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
        </div>
      `).join('');
    }

    this.setupFolderDragEvents();
  }

  openBookmarkUrl(url, e) {
    if (!url) return;
    const inNewTab = e.ctrlKey || e.metaKey || e.button === 1;
    if (inNewTab) {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        try {
          chrome.tabs.getCurrent((currentTab) => {
            if (currentTab && typeof currentTab.index === 'number') {
              chrome.tabs.create({ url, index: currentTab.index + 1, active: true });
            } else {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const idx = (tabs && tabs[0] && typeof tabs[0].index === 'number') ? tabs[0].index + 1 : undefined;
                chrome.tabs.create({ url, index: idx, active: true });
              });
            }
          });
          return;
        } catch {}
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  setupFolderDragEvents() {
    this.refreshElements();
    if (!this.gridElement) return;

    this.gridElement.querySelectorAll('.bookmark-card, .bookmark-list-row').forEach(el => {
      el.onclick = (e) => {
        if (this.isDragging) {
          e.preventDefault();
          return;
        }
        const url = el.dataset.bmUrl;
        this.openBookmarkUrl(url, e);
      };

      el.ondragstart = (e) => {
        this.isDragging = true;
        el.classList.add('is-dragging');
        const itemData = {
          id: el.dataset.bmId,
          title: el.dataset.bmTitle || 'Bookmark',
          url: el.dataset.bmUrl,
          domain: el.dataset.bmDomain || this.extractDomain(el.dataset.bmUrl),
          favicon: el.dataset.bmFavicon || this.getFaviconUrl(el.dataset.bmUrl),
          category: el.dataset.bmCategory || 'General'
        };
        const payload = {
          type: 'folder-bookmark',
          data: itemData
        };
        window._activeDragItem = payload;
        this.activeDragPayload = payload;
        e.dataTransfer.effectAllowed = 'copyMove';
        try {
          e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        } catch {}
      };

      el.ondragend = () => {
        el.classList.remove('is-dragging');
        document.querySelectorAll('.drag-over, .dropzone-active, .tab-drag-over').forEach(item => item.classList.remove('drag-over', 'dropzone-active', 'tab-drag-over'));
        setTimeout(() => {
          this.isDragging = false;
          this.activeDragPayload = null;
          window._activeDragItem = null;
        }, 150);
      };
    });
  }

  setupCategoryDropEvents() {
    this.refreshElements();
    if (!this.tabsElement) return;

    this.tabsElement.querySelectorAll('.category-tab').forEach(tab => {
      tab.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        tab.classList.add('tab-drag-over');
      };

      tab.ondragleave = () => {
        tab.classList.remove('tab-drag-over');
      };

      tab.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        tab.classList.remove('tab-drag-over');

        const targetFolder = tab.dataset.folder;
        if (!targetFolder || targetFolder === 'all') return;

        let payload = this.activeDragPayload || window._activeDragItem;
        if (!payload) {
          try {
            const raw = e.dataTransfer.getData('text/plain');
            if (raw) payload = JSON.parse(raw);
          } catch {}
        }

        if (payload && payload.data && payload.data.url) {
          const item = payload.data;
          const oldFolder = item.category || 'General';

          if (oldFolder === targetFolder) return;

          // 1. If Chrome bookmarks API available, move in Chrome tree
          if (item.id && typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.move) {
            const destFolderNodeId = this.folderNodeIds.get(targetFolder);
            if (destFolderNodeId) {
              try {
                await new Promise((resolve) => {
                  chrome.bookmarks.move(item.id, { parentId: destFolderNodeId }, resolve);
                });
              } catch (err) {
                console.warn('Chrome bookmarks.move error:', err);
              }
            }
          }

          // 2. Update memory structures
          if (this.folders.has(oldFolder)) {
            const arr = this.folders.get(oldFolder);
            const idx = arr.findIndex(b => b.url === item.url);
            if (idx >= 0) arr.splice(idx, 1);
          }

          item.category = targetFolder;
          if (!this.folders.has(targetFolder)) {
            this.folders.set(targetFolder, []);
          }
          this.folders.get(targetFolder).push(item);

          const mainItem = this.bookmarks.find(b => b.url === item.url);
          if (mainItem) mainItem.category = targetFolder;

          // 3. Switch view to that folder
          this.currentFolder = targetFolder;
          localStorage.setItem('hermes_last_folder', targetFolder);

          this.renderCategoryTabs();
          this.renderFolderView();
        }
      };
    });
  }

  updateViewModeButtons() {
    this.refreshElements();
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
    this.refreshElements();

    // Category Tabs Switching
    if (this.tabsElement) {
      this.tabsElement.onclick = (e) => {
        const btn = e.target.closest('.category-tab');
        if (!btn) return;

        this.currentFolder = btn.dataset.folder;
        localStorage.setItem('hermes_last_folder', this.currentFolder);
        this.tabsElement.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        this.renderFolderView();
      };
    }

    // Carousel Buttons
    if (this.carouselPrev && this.tabsElement) {
      this.carouselPrev.onclick = () => {
        this.tabsElement.scrollBy({ left: -240, behavior: 'smooth' });
      };
    }

    if (this.carouselNext && this.tabsElement) {
      this.carouselNext.onclick = () => {
        this.tabsElement.scrollBy({ left: 240, behavior: 'smooth' });
      };
    }

    // View Toggles
    if (this.btnViewGrid) {
      this.btnViewGrid.onclick = () => {
        this.viewMode = 'grid';
        localStorage.setItem('hermes_bookmark_view', 'grid');
        this.updateViewModeButtons();
        this.renderFolderView();
      };
    }

    if (this.btnViewList) {
      this.btnViewList.onclick = () => {
        this.viewMode = 'list';
        localStorage.setItem('hermes_bookmark_view', 'list');
        this.updateViewModeButtons();
        this.renderFolderView();
      };
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
