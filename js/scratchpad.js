// Scratchpad & Quick Markdown Notes

class Scratchpad {
  constructor() {
    this.textarea = document.getElementById('scratchpad-input');
    this.copyBtn = document.getElementById('btn-copy-notes');
    this.statusEl = document.getElementById('scratchpad-status');
    this.countEl = document.getElementById('scratchpad-count');
    this.storageKey = 'hermes_scratchpad_content';
  }

  async init() {
    if (!this.textarea) return;
    await this.loadContent();
    this.setupListeners();
    this.updateStats();
  }

  async loadContent() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([this.storageKey]);
        if (data && data[this.storageKey] !== undefined) {
          this.textarea.value = data[this.storageKey];
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read chrome.storage, falling back to localStorage:', e);
    }

    // Fallback to standard localStorage
    const saved = localStorage.getItem(this.storageKey);
    if (saved !== null) {
      this.textarea.value = saved;
    }
  }

  async saveContent() {
    const val = this.textarea.value;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [this.storageKey]: val });
      }
    } catch {}
    localStorage.setItem(this.storageKey, val);

    if (this.statusEl) {
      this.statusEl.textContent = 'Saved';
      setTimeout(() => {
        if (this.statusEl) this.statusEl.textContent = 'Saved locally';
      }, 1500);
    }
    this.updateStats();
  }

  updateStats() {
    if (!this.countEl || !this.textarea) return;
    const text = this.textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    this.countEl.textContent = `${words} words • ${chars} chars`;
  }

  setupListeners() {
    let debounceTimer;
    this.textarea.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      if (this.statusEl) this.statusEl.textContent = 'Saving...';
      debounceTimer = setTimeout(() => this.saveContent(), 300);
    });

    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this.textarea.value);
          const originalHTML = this.copyBtn.innerHTML;
          this.copyBtn.innerHTML = ICONS.check;
          this.copyBtn.style.color = 'var(--status-online)';
          setTimeout(() => {
            this.copyBtn.innerHTML = originalHTML;
            this.copyBtn.style.color = '';
          }, 1500);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      });
    }
  }
}

window.scratchpad = new Scratchpad();
