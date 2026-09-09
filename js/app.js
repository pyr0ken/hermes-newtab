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
  if (window.weatherEngine) {
    await window.weatherEngine.init();
  }

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
      
      if (window.weatherEngine) await window.weatherEngine.fetchWeather();
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
  const greetingEl = document.getElementById('greeting-text');
  const quoteEl = document.getElementById('daily-quote');

  const thoughts = [
    '"Build systems that grow with you."',
    '"First make it work, then make it right, then make it fast."',
    '"Simplicity is prerequisite for reliability."',
    '"Autonomous agents, local telemetry, zero bloat."',
    '"Code is poetry written for machines to dance."',
    '"Stay curious, build fearlessly."'
  ];

  let currentQuoteIdx = Math.floor(Math.random() * thoughts.length);
  if (quoteEl) {
    quoteEl.textContent = thoughts[currentQuoteIdx];
    quoteEl.addEventListener('click', () => {
      currentQuoteIdx = (currentQuoteIdx + 1) % thoughts.length;
      quoteEl.style.opacity = '0';
      quoteEl.style.transition = 'opacity 150ms ease';
      setTimeout(() => {
        quoteEl.textContent = thoughts[currentQuoteIdx];
        quoteEl.style.opacity = '1';
      }, 150);
    });
  }

  function updateTime() {
    const now = new Date();
    const hours = now.getHours();

    // Dynamic Greeting
    if (greetingEl) {
      if (hours >= 5 && hours < 12) {
        greetingEl.textContent = 'Good morning';
      } else if (hours >= 12 && hours < 17) {
        greetingEl.textContent = 'Good afternoon';
      } else if (hours >= 17 && hours < 21) {
        greetingEl.textContent = 'Good evening';
      } else {
        greetingEl.textContent = 'Good night';
      }
    }

    // Time (HH:MM:SS)
    if (clockEl) {
      const h = String(hours).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s}`;
    }

    // Gregorian Date
    if (gregDateEl) {
      const options = { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' };
      gregDateEl.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}
