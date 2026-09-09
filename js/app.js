// Hermes NewTab — Main Orchestrator

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Hydrate UI icons
  const brandSlot = document.getElementById('brand-icon-slot');
  if (brandSlot && typeof ICONS !== 'undefined') {
    brandSlot.innerHTML = ICONS.hermes;
  }

  // 2. Start Live Clock & Dual Date
  initClockAndDate();

  // 3. Initialize all sub-modules
  if (window.bookmarksEngine) {
    await window.bookmarksEngine.init();
  }

  if (window.commandPalette) {
    window.commandPalette.init();
  }

  if (window.systemMonitor) {
    window.systemMonitor.init();
  }

  if (window.scratchpad) {
    await window.scratchpad.init();
  }

  // 4. Global Action Buttons
  const reloadBtn = document.getElementById('btn-reload');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      reloadBtn.style.transform = 'rotate(360deg)';
      reloadBtn.style.transition = 'transform 500ms ease';
      
      if (window.bookmarksEngine) await window.bookmarksEngine.init();
      if (window.systemMonitor) await window.systemMonitor.fetchMetrics();
      
      setTimeout(() => {
        reloadBtn.style.transform = 'none';
        reloadBtn.style.transition = 'none';
      }, 500);
    });
  }

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      alert('Hermes NewTab is configured locally via manifest.json and bridge/server.py.\n\nShortcut guide:\n• Ctrl+K or / : Search\n• Esc : Dismiss search');
    });
  }
});

function initClockAndDate() {
  const clockEl = document.getElementById('live-clock');
  const gregDateEl = document.getElementById('gregorian-date');
  const persianDateEl = document.getElementById('persian-date');

  function updateTime() {
    const now = new Date();

    // Time (HH:MM:SS)
    if (clockEl) {
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s}`;
    }

    // Gregorian Date
    if (gregDateEl) {
      const options = { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' };
      gregDateEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // Persian (Solar Hijri) Date
    if (persianDateEl) {
      try {
        const faDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(now);
        persianDateEl.textContent = faDate;
      } catch {
        persianDateEl.textContent = '';
      }
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}
