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

    // Services
    if (data.services) {
      for (const [key, svc] of Object.entries(data.services)) {
        const dot = document.getElementById(`svc-dot-${svc.port}`);
        const badge = document.getElementById(`svc-badge-${svc.port}`);
        
        if (dot && badge) {
          if (svc.online) {
            dot.className = 'status-dot online';
            badge.className = 'service-badge online';
            badge.textContent = 'ONLINE';
          } else {
            dot.className = 'status-dot';
            badge.className = 'service-badge';
            badge.textContent = 'STOPPED';
          }
        }
      }
    }
  }
}

window.systemMonitor = new SystemMonitor();
