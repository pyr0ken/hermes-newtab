// Hermes NewTab — GitHub Contribution Graph & Activity Heatmap Engine

class GitHubActivityEngine {
  constructor() {
    this.username = localStorage.getItem('hermes_github_user') || 'pyr0ken';
    this.containerEl = null;
    this.totalEl = null;
    this.tooltipEl = null;

    this.colors = {
      0: 'rgba(239, 68, 68, 0.25)',
      1: '#0e3a6c',
      2: '#1d4ed8',
      3: '#3b82f6',
      4: '#60a5fa'
    };

    this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  async init() {
    this.containerEl = document.getElementById('github-heatmap-wrapper');
    this.totalEl = document.getElementById('contrib-total');
    if (!this.containerEl) return;

    // 1. Create floating tooltip if not exists
    this.createTooltip();

    // 2. Load and render from cache immediately (0ms instant paint)
    const cached = this.loadCache();
    if (cached && cached.contributions && cached.contributions.length > 0) {
      this.renderGraph(cached);
    }

    // 3. Fetch fresh data in background
    await this.fetchContributions();
  }

  createTooltip() {
    let tip = document.getElementById('github-heatmap-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'github-heatmap-tooltip';
      tip.className = 'github-heatmap-tooltip font-mono';
      document.body.appendChild(tip);
    }
    this.tooltipEl = tip;
  }

  loadCache() {
    try {
      const raw = localStorage.getItem(`hermes_github_cache_${this.username}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  saveCache(data) {
    try {
      localStorage.setItem(`hermes_github_cache_${this.username}`, JSON.stringify(data));
    } catch {}
  }

  async fetchContributions() {
    const urls = [
      `https://github-contributions-api.jogruber.de/v4/${this.username}?y=last`,
      `https://github-contributions.vercel.app/api/v1/${this.username}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        
        let contributions = [];
        let totalCount = 0;

        if (data.contributions && Array.isArray(data.contributions)) {
          contributions = data.contributions;
          totalCount = data.total?.lastYear || contributions.reduce((acc, c) => acc + (c.count || 0), 0);
        } else if (Array.isArray(data)) {
          contributions = data;
          totalCount = contributions.reduce((acc, c) => acc + (c.count || 0), 0);
        }

        if (contributions.length > 0) {
          const payload = { total: totalCount, contributions };
          this.saveCache(payload);
          this.renderGraph(payload);
          return;
        }
      } catch (err) {
        console.warn('GitHub contributions fetch failed on:', url, err);
      }
    }

    // If fetch failed and no cache, render fallback
    if (!this.loadCache()) {
      this.renderFallback();
    }
  }

  renderGraph(data) {
    if (!this.containerEl) return;
    const contribs = data.contributions || [];
    const total = data.total || contribs.reduce((sum, c) => sum + (c.count || 0), 0);

    if (this.totalEl) {
      this.totalEl.textContent = `${total.toLocaleString()} contributions in the last year`;
    }

    // Group into 53 weeks
    const weeks = [];
    let curWeek = [];
    for (const c of contribs) {
      const d = new Date(c.date + 'T00:00:00');
      const dow = d.getDay(); // 0 = Sun, 6 = Sat
      curWeek.push({ ...c, dow, month: d.getMonth(), day: d.getDate(), dateObj: d });
      if (dow === 6 || c === contribs[contribs.length - 1]) {
        weeks.push(curWeek);
        curWeek = [];
      }
    }

    const leftPadding = 28;
    const topPadding = 18;
    const cellSize = 10;
    const cellGap = 3;
    const stride = cellSize + cellGap; // 13px

    const svgWidth = leftPadding + (weeks.length * stride) + 6;
    const svgHeight = topPadding + (7 * stride) + 4;

    // Month headers
    let lastMonth = -1;
    let monthLabelsSvg = '';
    weeks.forEach((w, col) => {
      const firstDay = w[0];
      if (firstDay && firstDay.month !== lastMonth) {
        lastMonth = firstDay.month;
        const x = leftPadding + (col * stride);
        monthLabelsSvg += `
          <text x="${x}" y="12" class="cal-svg-month">${this.monthNames[firstDay.month]}</text>
        `;
      }
    });

    // Weekday labels (Mon, Wed, Fri)
    const weekdayLabelsSvg = `
      <text x="4" y="${topPadding + (1 * stride) + 8}" class="cal-svg-weekday">Mon</text>
      <text x="4" y="${topPadding + (3 * stride) + 8}" class="cal-svg-weekday">Wed</text>
      <text x="4" y="${topPadding + (5 * stride) + 8}" class="cal-svg-weekday">Fri</text>
    `;

    // Squares
    let squaresSvg = '';
    weeks.forEach((week, colIndex) => {
      const colX = leftPadding + (colIndex * stride);
      week.forEach(day => {
        const rowY = topPadding + (day.dow * stride);
        const color = this.colors[day.level] || this.colors[0];
        const count = day.count || 0;
        const dateStr = day.date;

        squaresSvg += `
          <rect 
            x="${colX}" 
            y="${rowY}" 
            width="${cellSize}" 
            height="${cellSize}" 
            rx="2.5" 
            ry="2.5" 
            fill="${color}" 
            class="gh-square lvl-${day.level || 0}" 
            data-date="${dateStr}" 
            data-count="${count}"
          ></rect>
        `;
      });
    });

    this.containerEl.innerHTML = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="github-heatmap-svg" preserveAspectRatio="xMinYMin meet">
        ${monthLabelsSvg}
        ${weekdayLabelsSvg}
        ${squaresSvg}
      </svg>
    `;

    this.attachSquareListeners();
  }

  attachSquareListeners() {
    if (!this.containerEl) return;
    const squares = this.containerEl.querySelectorAll('.gh-square');

    squares.forEach(sq => {
      sq.addEventListener('mouseenter', (e) => {
        const count = parseInt(sq.dataset.count, 10);
        const dateStr = sq.dataset.date;
        if (!dateStr) return;

        const d = new Date(dateStr + 'T00:00:00');
        const formattedEn = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        
        let faStr = '';
        if (window.dualCalendar && window.dualCalendar.toJalaali) {
          const j = window.dualCalendar.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
          const jDayIdx = (d.getDay() + 1) % 7;
          const faWeekday = window.dualCalendar.faWeekdays[jDayIdx];
          const faMonth = window.dualCalendar.faMonths[j.jm - 1];
          faStr = `<div class="tooltip-fa">${faWeekday} ${j.jd} ${faMonth} ${j.jy}</div>`;
        }

        const countText = count === 0 ? 'No contributions' : `${count} contribution${count === 1 ? '' : 's'}`;

        if (this.tooltipEl) {
          this.tooltipEl.innerHTML = `
            <div class="tooltip-count ${count === 0 ? 'zero' : ''}">${countText}</div>
            <div class="tooltip-date">${formattedEn}</div>
            ${faStr}
          `;
          this.tooltipEl.classList.add('visible');
          this.positionTooltip(e);
        }
      });

      sq.addEventListener('mousemove', (e) => {
        this.positionTooltip(e);
      });

      sq.addEventListener('mouseleave', () => {
        if (this.tooltipEl) {
          this.tooltipEl.classList.remove('visible');
        }
      });
    });
  }

  positionTooltip(e) {
    if (!this.tooltipEl) return;
    const x = e.clientX + 12;
    const y = e.clientY - 38;
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  renderFallback() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.78rem;">
        <a href="https://github.com/${this.username}" target="_blank" style="color: var(--accent-blue); text-decoration: none;">
          View @${this.username}'s contributions on GitHub ↗
        </a>
      </div>
    `;
  }
}

window.githubActivity = new GitHubActivityEngine();
