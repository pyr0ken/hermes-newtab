// Hermes NewTab — Smooth Horizontal Column & Box Resizer Engine
// Enables interactive dragging of column splitters with auto-persistence in chrome.storage / localStorage

class LayoutResizer {
  constructor() {
    this.storageKey = 'hermes_dashboard_col_widths';
    this.defaults = {
      left: 320,
      right: 320,
      dualLeft: 50,
      dualRight: 50
    };

    this.minColWidth = 220;
    this.maxColPercent = 0.45; // Max 45% of total grid width for side columns
    this.minDualPercent = 20;
    this.maxDualPercent = 80;

    this.dashboardGrid = null;
    this.centerDualGrid = null;
    this.activeDrag = null;

    this.init = this.init.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  getSavedConfig() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          left: Number(parsed.left) || this.defaults.left,
          right: Number(parsed.right) || this.defaults.right,
          dualLeft: Number(parsed.dualLeft) || this.defaults.dualLeft,
          dualRight: Number(parsed.dualRight) || this.defaults.dualRight
        };
      }
    } catch (e) {
      console.warn('Failed to load saved column widths:', e);
    }
    return { ...this.defaults };
  }

  async saveConfig(config) {
    try {
      const payload = {
        left: Math.round(config.left),
        right: Math.round(config.right),
        dualLeft: Math.round(config.dualLeft),
        dualRight: Math.round(config.dualRight)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [this.storageKey]: payload });
      }
    } catch (e) {
      console.warn('Failed to save column widths:', e);
    }
  }

  async loadFromStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([this.storageKey]);
        if (data && data[this.storageKey]) {
          const stored = data[this.storageKey];
          const config = {
            left: Number(stored.left) || this.defaults.left,
            right: Number(stored.right) || this.defaults.right,
            dualLeft: Number(stored.dualLeft) || this.defaults.dualLeft,
            dualRight: Number(stored.dualRight) || this.defaults.dualRight
          };
          this.applyConfig(config);
          localStorage.setItem(this.storageKey, JSON.stringify(config));
          return config;
        }
      }
    } catch (e) {}
    const config = this.getSavedConfig();
    this.applyConfig(config);
    return config;
  }

  init() {
    this.dashboardGrid = document.querySelector('.dashboard-grid-3col');
    this.centerDualGrid = document.querySelector('.center-dual-grid');

    // Immediate synchronous apply from localStorage, followed by async chrome.storage sync
    const config = this.getSavedConfig();
    this.applyConfig(config);
    this.loadFromStorage();

    // Setup resizer elements
    const resizers = document.querySelectorAll('.col-resizer');
    resizers.forEach(resizer => {
      resizer.addEventListener('pointerdown', this.onPointerDown);
      resizer.addEventListener('mousedown', this.onPointerDown); // Robust fallback
      resizer.addEventListener('dblclick', (e) => this.onDoubleClick(e, resizer));
    });

    // Window-level events during drag
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('mousemove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('mouseup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    // Responsive bounds check on window resize
    window.addEventListener('resize', () => {
      this.enforceBounds();
    });
  }

  applyConfig(config) {
    const root = document.documentElement;
    if (config.left) {
      root.style.setProperty('--col-left-width', `${Math.round(config.left)}px`);
    }
    if (config.right) {
      root.style.setProperty('--col-right-width', `${Math.round(config.right)}px`);
    }
    if (config.dualLeft !== undefined && config.dualRight !== undefined) {
      root.style.setProperty('--dual-left-ratio', `${config.dualLeft}fr`);
      root.style.setProperty('--dual-right-ratio', `${config.dualRight}fr`);
    }
  }

  enforceBounds() {
    if (!this.dashboardGrid) return;
    const gridWidth = this.dashboardGrid.getBoundingClientRect().width;
    if (gridWidth < 800) return; // Breakpoint handles mobile/tablet

    const config = this.getSavedConfig();
    const maxAllowed = Math.floor(gridWidth * this.maxColPercent);

    let changed = false;
    if (config.left > maxAllowed) {
      config.left = Math.max(this.minColWidth, maxAllowed);
      changed = true;
    }
    if (config.right > maxAllowed) {
      config.right = Math.max(this.minColWidth, maxAllowed);
      changed = true;
    }

    if (changed) {
      this.applyConfig(config);
      this.saveConfig(config);
    }
  }

  onPointerDown(e) {
    // Only handle primary button (left-click) or touch
    if (e.button !== 0 && e.button !== undefined && e.pointerType === 'mouse') return;

    const resizer = e.currentTarget;
    if (!resizer || !resizer.dataset) return;
    const type = resizer.dataset.resizer; // 'left' | 'right' | 'dual'
    if (!type) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      if (e.pointerId !== undefined && typeof resizer.setPointerCapture === 'function') {
        resizer.setPointerCapture(e.pointerId);
      }
    } catch (err) {}

    const config = this.getSavedConfig();
    let gridRect = null;
    let initialColWidth = 0;

    if (type === 'left' || type === 'right') {
      if (!this.dashboardGrid) {
        this.dashboardGrid = document.querySelector('.dashboard-grid-3col');
      }
      if (!this.dashboardGrid) return;
      gridRect = this.dashboardGrid.getBoundingClientRect();

      const colEl = type === 'left' ? document.querySelector('.col-left') : document.querySelector('.col-right');
      initialColWidth = colEl ? colEl.getBoundingClientRect().width : (type === 'left' ? config.left : config.right);
    } else if (type === 'dual') {
      if (!this.centerDualGrid) {
        this.centerDualGrid = document.querySelector('.center-dual-grid');
      }
      if (!this.centerDualGrid) return;
      gridRect = this.centerDualGrid.getBoundingClientRect();
    }

    const tooltipEl = resizer.querySelector('.resizer-tooltip');

    this.activeDrag = {
      type,
      pointerId: e.pointerId,
      resizer,
      tooltipEl,
      startX: e.clientX,
      initialColWidth,
      gridRect,
      currentConfig: { ...config }
    };

    resizer.classList.add('is-dragging');
    document.body.classList.add('is-resizing-columns');

    if (tooltipEl) {
      const displayVal = type === 'dual' ? (config.dualLeft || 50) : initialColWidth;
      this.updateTooltip(tooltipEl, type, displayVal);
      tooltipEl.classList.add('visible');
    }
  }

  onPointerMove(e) {
    if (!this.activeDrag) return;

    // Check pointerId match if available
    if (e.pointerId !== undefined && this.activeDrag.pointerId !== undefined && e.pointerId !== this.activeDrag.pointerId) {
      return;
    }

    e.preventDefault();

    const { type, resizer, gridRect, tooltipEl, currentConfig } = this.activeDrag;
    const root = document.documentElement;
    const resizerWidth = (resizer && resizer.getBoundingClientRect().width) || 8;
    const halfGutter = resizerWidth / 2;

    if (type === 'left') {
      const rawWidth = e.clientX - gridRect.left - halfGutter;
      const maxWidth = Math.floor(gridRect.width * this.maxColPercent);
      const clampedWidth = Math.round(Math.max(this.minColWidth, Math.min(maxWidth, rawWidth)));

      currentConfig.left = clampedWidth;
      root.style.setProperty('--col-left-width', `${clampedWidth}px`);

      if (tooltipEl) {
        this.updateTooltip(tooltipEl, 'left', clampedWidth);
      }
    } else if (type === 'right') {
      const rawWidth = gridRect.right - e.clientX - halfGutter;
      const maxWidth = Math.floor(gridRect.width * this.maxColPercent);
      const clampedWidth = Math.round(Math.max(this.minColWidth, Math.min(maxWidth, rawWidth)));

      currentConfig.right = clampedWidth;
      root.style.setProperty('--col-right-width', `${clampedWidth}px`);

      if (tooltipEl) {
        this.updateTooltip(tooltipEl, 'right', clampedWidth);
      }
    } else if (type === 'dual') {
      const availableWidth = gridRect.width - resizerWidth;
      if (availableWidth > 0) {
        const mouseOffset = e.clientX - gridRect.left - halfGutter;
        const rawPercent = (mouseOffset / availableWidth) * 100;
        const clampedPercent = Math.round(Math.max(this.minDualPercent, Math.min(this.maxDualPercent, rawPercent)));

        const dualLeft = clampedPercent;
        const dualRight = 100 - clampedPercent;

        currentConfig.dualLeft = dualLeft;
        currentConfig.dualRight = dualRight;

        root.style.setProperty('--dual-left-ratio', `${dualLeft}fr`);
        root.style.setProperty('--dual-right-ratio', `${dualRight}fr`);

        if (tooltipEl) {
          this.updateTooltip(tooltipEl, 'dual', clampedPercent);
        }
      }
    }
  }

  updateTooltip(tooltipEl, type, val) {
    if (!tooltipEl) return;
    if (type === 'dual') {
      tooltipEl.textContent = `${Math.round(val)}% : ${Math.round(100 - val)}%`;
    } else {
      tooltipEl.textContent = `${Math.round(val)}px`;
    }
  }

  onPointerUp(e) {
    if (!this.activeDrag) return;

    const { resizer, tooltipEl, currentConfig, pointerId } = this.activeDrag;

    try {
      if (pointerId !== undefined && typeof resizer.releasePointerCapture === 'function') {
        resizer.releasePointerCapture(pointerId);
      }
    } catch (err) {}

    if (resizer) {
      resizer.classList.remove('is-dragging');
    }
    document.body.classList.remove('is-resizing-columns');

    if (tooltipEl) {
      tooltipEl.classList.remove('visible');
    }

    // Persist final dimensions
    this.saveConfig(currentConfig);
    this.activeDrag = null;
  }

  onDoubleClick(e, resizer) {
    if (!resizer || !resizer.dataset) return;
    const type = resizer.dataset.resizer;
    const config = this.getSavedConfig();
    const root = document.documentElement;

    if (type === 'left') {
      config.left = this.defaults.left;
      root.style.setProperty('--col-left-width', `${this.defaults.left}px`);
    } else if (type === 'right') {
      config.right = this.defaults.right;
      root.style.setProperty('--col-right-width', `${this.defaults.right}px`);
    } else if (type === 'dual') {
      config.dualLeft = this.defaults.dualLeft;
      config.dualRight = this.defaults.dualRight;
      root.style.setProperty('--dual-left-ratio', `${this.defaults.dualLeft}fr`);
      root.style.setProperty('--dual-right-ratio', `${this.defaults.dualRight}fr`);
    }

    this.saveConfig(config);

    // Visual feedback on reset
    resizer.classList.add('is-reset');
    setTimeout(() => resizer.classList.remove('is-reset'), 300);
  }
}

window.layoutResizer = new LayoutResizer();
