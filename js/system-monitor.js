// System Telemetry & Local Services Monitor

class SystemMonitor {
  constructor() {
    this.bridgeUrl = 'http://127.0.0.1:20250/api/status';
    this.pollInterval = 3500; // ms
    this.timer = null;
    this.isOnline = false;

    this.elements = {
      bridgeDot: document.getElementById('bridge-dot'),
      bridgeText: document.getElementById('bridge-text'),
      cpuVal: document.getElementById('cpu-val'),
      cpuBar: document.getElementById('cpu-bar'),
      ramVal: document.getElementById('ram-val'),
      ramBar: document.getElementById('ram-bar'),
      gpuVal: document.getElementById('gpu-val'),
      gpuBar: document.getElementById('gpu-bar'),
      servicesList: document.getElementById('services-list')
    };

    this.serviceIcons = {
      paperclip: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
      omniroute: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
      oxiroute: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      golestan: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      ayh: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M6.5 9a11.5 11.5 0 0 1 11 0M12 7v7m-4 3 4-3 4 3m-7 4 3-4 3 4"/></svg>`,
      default: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`
    };
  }

  init() {
    this.fetchMetrics();
    this.timer = setInterval(() => this.fetchMetrics(), this.pollInterval);
  }

  async fetchMetrics() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(this.bridgeUrl, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.updateOnlineState(true);
        this.renderMetrics(data);
      } else {
        this.updateOnlineState(false);
      }
    } catch {
      this.updateOnlineState(false);
    }
  }

  updateOnlineState(online) {
    this.isOnline = online;
    if (this.elements.bridgeDot && this.elements.bridgeText) {
      if (online) {
        this.elements.bridgeDot.className = 'status-dot online';
        this.elements.bridgeText.textContent = 'BRIDGE ONLINE';
      } else {
        this.elements.bridgeDot.className = 'status-dot';
        this.elements.bridgeText.textContent = 'BRIDGE OFFLINE';
      }
    }

    if (!online) {
      if (this.elements.cpuVal) this.elements.cpuVal.textContent = 'Bridge inactive';
      if (this.elements.cpuBar) this.elements.cpuBar.style.width = '0%';
      if (this.elements.ramVal) this.elements.ramVal.textContent = '-- / -- GB';
      if (this.elements.ramBar) this.elements.ramBar.style.width = '0%';
      if (this.elements.gpuVal) this.elements.gpuVal.textContent = 'N/A';
      if (this.elements.gpuBar) this.elements.gpuBar.style.width = '0%';
    }
  }

  renderMetrics(data) {
    // CPU
    if (data.cpu && this.elements.cpuVal && this.elements.cpuBar) {
      const pct = data.cpu.percent || 0;
      this.elements.cpuVal.textContent = `${pct}%`;
      this.elements.cpuBar.style.width = `${pct}%`;
    }

    // RAM
    if (data.ram && this.elements.ramVal && this.elements.ramBar) {
      const used = data.ram.used_gb || 0;
      const total = data.ram.total_gb || 0;
      const pct = data.ram.percent || 0;
      this.elements.ramVal.textContent = `${used} / ${total} GB (${pct}%)`;
      this.elements.ramBar.style.width = `${pct}%`;
    }

    // GPU
    if (data.gpu && this.elements.gpuVal && this.elements.gpuBar) {
      if (data.gpu.available) {
        const util = data.gpu.util_percent || 0;
        const temp = data.gpu.temp_c || 0;
        const vramUsed = Math.round((data.gpu.vram_used_mb || 0) / 1024 * 10) / 10;
        const vramTotal = Math.round((data.gpu.vram_total_mb || 0) / 1024 * 10) / 10;
        this.elements.gpuVal.textContent = `${util}% • ${temp}°C (${vramUsed}/${vramTotal}G)`;
        this.elements.gpuBar.style.width = `${util}%`;
      } else {
        this.elements.gpuVal.textContent = 'Offline / Integrated';
        this.elements.gpuBar.style.width = '0%';
      }
    }

    // Services Interactive 2-Column Grid (Matching Market Ticker)
    if (data.services && this.elements.servicesList) {
      // Sort online/running services first, then by name
      const sortedServices = Object.entries(data.services).sort((a, b) => {
        if (a[1].online && !b[1].online) return -1;
        if (!a[1].online && b[1].online) return 1;
        return a[1].name.localeCompare(b[1].name);
      });

      this.elements.servicesList.innerHTML = sortedServices.map(([key, svc]) => {
        const isOnline = svc.online;
        const localhostUrl = `http://localhost:${svc.port}`;
        const iconSvg = this.serviceIcons[key] || this.serviceIcons.default;
        
        const badgeClass = isOnline ? 'online' : 'offline';
        const badgeText = isOnline 
          ? (svc.latency_ms !== null && svc.latency_ms !== undefined ? `${svc.latency_ms}ms` : 'ON') 
          : 'OFF';

        const toggleBtnText = isOnline ? 'Stop' : 'Start';
        const toggleBtnClass = isOnline ? 'service-tile-btn running' : 'service-tile-btn';

        return `
          <div class="service-tile ${isOnline ? 'is-online' : 'is-offline'}" data-url="${localhostUrl}" data-online="${isOnline}" title="${svc.name} (${localhostUrl}) — Click to open">
            <div class="service-tile-top">
              <div class="service-tile-title-group">
                <span class="service-tile-icon ${isOnline ? 'online' : ''}">${iconSvg}</span>
                <span class="service-tile-name font-mono">${svc.name}</span>
              </div>
              <span class="service-tile-badge ${badgeClass} font-mono">${badgeText}</span>
            </div>

            <div class="service-tile-middle font-mono">
              <span class="service-tile-port">:${svc.port}</span>
              <button class="${toggleBtnClass}" data-svc-key="${key}" title="${isOnline ? 'Stop service' : 'Start service'}">
                ${toggleBtnText}
              </button>
            </div>

            <div class="service-tile-bottom">
              <span class="service-tile-desc">${svc.desc || (isOnline ? 'Ready' : 'Inactive')}</span>
            </div>
          </div>
        `;
      }).join('');

      // Attach click listeners to tiles and toggle buttons
      this.elements.servicesList.querySelectorAll('.service-tile').forEach(tile => {
        // Toggle button click
        const btn = tile.querySelector('.service-tile-btn');
        if (btn) {
          btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const svcKey = btn.dataset.svcKey;
            await this.toggleService(svcKey, btn);
          };
        }

        // Tile navigation click (always open in adjacent new tab)
        tile.onclick = (e) => {
          if (e.target.closest('.service-tile-btn')) return;
          const url = tile.dataset.url;
          if (!url) return;
          this.openAdjacentTab(url, true);
        };
      });
    }
  }

  openAdjacentTab(url, active = true) {
    if (!url) return;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      try {
        chrome.tabs.getCurrent((currentTab) => {
          if (currentTab && typeof currentTab.index === 'number') {
            chrome.tabs.create({ url, index: currentTab.index + 1, active });
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const idx = (tabs && tabs[0] && typeof tabs[0].index === 'number') ? tabs[0].index + 1 : undefined;
              chrome.tabs.create({ url, index: idx, active });
            });
          }
        });
        return;
      } catch {}
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async toggleService(svcKey, btn) {
    if (!svcKey || !btn) return;
    const origText = btn.textContent;
    btn.textContent = '...';
    btn.classList.add('loading');

    try {
      const res = await fetch('http://127.0.0.1:20250/api/service/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: svcKey })
      });
      if (res.ok) {
        await new Promise(r => setTimeout(r, 400));
        await this.fetchMetrics();
      }
    } catch (err) {
      console.warn('Service toggle error:', err);
    } finally {
      btn.classList.remove('loading');
    }
  }
}

window.systemMonitor = new SystemMonitor();
