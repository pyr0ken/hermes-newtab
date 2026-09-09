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

    // Services Interactive Control Matrix
    if (data.services && this.elements.servicesList) {
      this.elements.servicesList.innerHTML = Object.entries(data.services).map(([key, svc]) => {
        const isOnline = svc.online;
        const dotClass = isOnline ? 'status-dot online' : 'status-dot';
        const localhostUrl = `http://localhost:${svc.port}`;
        
        const latencyHtml = (isOnline && svc.latency_ms !== null && svc.latency_ms !== undefined)
          ? `<span class="service-latency-pill">${svc.latency_ms}ms</span>`
          : ``;

        const toggleBtnText = isOnline ? 'Stop' : 'Start';
        const toggleBtnClass = isOnline ? 'service-toggle-btn running' : 'service-toggle-btn';

        return `
          <div class="service-row" data-url="${localhostUrl}" data-online="${isOnline}" title="${svc.name} (${localhostUrl}) — ${isOnline ? 'Click to open in browser' : 'Offline'}">
            <div class="service-left">
              <div class="service-dot-wrapper">
                <span class="${dotClass}"></span>
              </div>
              <div class="service-details">
                <span class="service-name">${svc.name}</span>
                <span class="service-meta">
                  <span class="service-port-link">:${svc.port}</span>
                  <span style="opacity:0.4;">•</span>
                  <span>${svc.desc || (isOnline ? 'Ready' : 'Inactive')}</span>
                </span>
              </div>
            </div>
            <div class="service-right">
              ${latencyHtml}
              <button class="${toggleBtnClass}" data-svc-key="${key}" title="${isOnline ? 'Stop service' : 'Start service'}">
                ${toggleBtnText}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Attach click listeners to rows and toggle buttons
      this.elements.servicesList.querySelectorAll('.service-row').forEach(row => {
        // Toggle button click
        const btn = row.querySelector('.service-toggle-btn');
        if (btn) {
          btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const svcKey = btn.dataset.svcKey;
            await this.toggleService(svcKey, btn);
          };
        }

        // Row navigation click (always open in adjacent new tab)
        row.onclick = (e) => {
          if (e.target.closest('.service-toggle-btn')) return;
          const url = row.dataset.url;
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
