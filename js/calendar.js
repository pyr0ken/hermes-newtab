// Hermes NewTab — Dual Calendar Engine (Persian Fingilish & Gregorian)

class DualCalendarEngine {
  constructor() {
    this.datePillEl = null;
    this.gregDateEl = null;
    this.persianDateEl = null;

    // View state
    this.currentMode = localStorage.getItem('hermes_calendar_mode') || 'jalali'; // 'jalali' | 'gregorian'
    this.activeJalali = { jy: 1405, jm: 6, jd: 19 };
    this.activeGregorian = { gy: 2026, gm: 9, gd: 10 };
    this.selectedDateInfo = null;

    // Localization in Fingilish
    this.faWeekdays = ['Shanbeh', 'Yekshanbeh', 'Doshanbeh', 'Seshanbeh', 'Chaharshanbeh', 'Panjshanbeh', 'Jomeh'];
    this.faShortWeekdays = ['Shan', 'Yek', 'Dosh', 'Sesh', 'Chah', 'Panj', 'Jom'];
    this.faMonths = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
    this.faShortMonths = ['Far', 'Ord', 'Kho', 'Tir', 'Mor', 'Shah', 'Meh', 'Aban', 'Azar', 'Dey', 'Bah', 'Esf'];
    this.faSeasons = ['Bahar (Spring)', 'Tabestan (Summer)', 'Paeez (Autumn)', 'Zemestan (Winter)'];

    // Gregorian localization
    this.enWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.enShortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this.enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.enShortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  // --- Astronomical Date Math Conversion ---

  toJalaali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { jy, jm, jd };
  }

  toGregorian(jy, jm, jd) {
    let days;
    jy = jy - 979;
    jm = jm - 1;
    jd = jd - 1;
    let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
    for (let i = 0; i < jm; ++i) j_day_no += (i < 6) ? 31 : 30;
    j_day_no += jd;
    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no = g_day_no % 146097;
    let leap = true;
    if (g_day_no >= 36525) {
      g_day_no--;
      gy += 100 * Math.floor(g_day_no / 36524);
      g_day_no = g_day_no % 36524;
      if (g_day_no >= 365) g_day_no++;
      else leap = false;
    }
    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;
    if (g_day_no >= 366) {
      leap = false;
      g_day_no--;
      gy += Math.floor(g_day_no / 365);
      g_day_no = g_day_no % 365;
    }
    const g_d_m = [0, 31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (gm < 12 && g_day_no >= g_d_m[gm + 1]) {
      g_day_no -= g_d_m[gm + 1];
      gm++;
    }
    return { gy, gm: gm + 1, gd: g_day_no + 1 };
  }

  isJalaaliLeap(jy) {
    const g = this.toGregorian(jy, 12, 30);
    const j = this.toJalaali(g.gy, g.gm, g.gd);
    return j.jy === jy && j.jm === 12 && j.jd === 30;
  }

  getJalaaliMonthDays(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return this.isJalaaliLeap(jy) ? 30 : 29;
  }

  isGregorianLeap(gy) {
    return (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
  }

  getGregorianMonthDays(gy, gm) {
    const days = [0, 31, (this.isGregorianLeap(gy) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[gm];
  }

  getJalaliSeason(jm) {
    if (jm >= 1 && jm <= 3) return this.faSeasons[0];
    if (jm >= 4 && jm <= 6) return this.faSeasons[1];
    if (jm >= 7 && jm <= 9) return this.faSeasons[2];
    return this.faSeasons[3];
  }

  // --- UI & Lifecycle ---

  init() {
    this.datePillEl = document.getElementById('btn-open-calendar');
    this.gregDateEl = document.getElementById('gregorian-date');
    this.persianDateEl = document.getElementById('persian-date');

    const now = new Date();
    const j = this.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    this.activeJalali = { jy: j.jy, jm: j.jm, jd: j.jd };
    this.activeGregorian = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };

    this.updateDatePills(now);
    this.setupEventListeners();
    this.renderCalendar();
  }

  updateDatePills(now = new Date()) {
    const j = this.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const gDayOfWeek = now.getDay(); // 0 = Sunday
    const jDayOfWeekIdx = (gDayOfWeek + 1) % 7; // 0 = Shanbeh

    const faWeekdayName = this.faWeekdays[jDayOfWeekIdx];
    const faMonthName = this.faMonths[j.jm - 1];

    const enWeekdayShort = this.enShortWeekdays[gDayOfWeek];
    const enMonthShort = this.enShortMonths[now.getMonth()];

    if (this.gregDateEl) {
      this.gregDateEl.textContent = `${enWeekdayShort}, ${now.getDate()} ${enMonthShort} ${now.getFullYear()}`;
    }

    if (this.persianDateEl) {
      this.persianDateEl.textContent = `${faWeekdayName}, ${j.jd} ${faMonthName} ${j.jy}`;
    }
  }

  setupEventListeners() {
    // Top Date pill click (scroll to or highlight calendar card)
    if (this.datePillEl) {
      this.datePillEl.addEventListener('click', () => {
        const calCard = document.getElementById('dash-calendar-card');
        if (calCard) {
          calCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          calCard.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.4)';
          setTimeout(() => {
            calCard.style.boxShadow = '';
          }, 1200);
        }
      });
    }

    // Calendar navigation buttons
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    const todayBtn = document.getElementById('cal-btn-today');
    const toggleJalali = document.getElementById('cal-toggle-jalali');
    const toggleGreg = document.getElementById('cal-toggle-gregorian');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateMonth(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateMonth(1));
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.jumpToToday());
    }

    if (toggleJalali) {
      toggleJalali.addEventListener('click', () => {
        this.setMode('jalali');
      });
    }
    if (toggleGreg) {
      toggleGreg.addEventListener('click', () => {
        this.setMode('gregorian');
      });
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('hermes_calendar_mode', mode);
    this.renderCalendar();
  }

  navigateMonth(delta) {
    if (this.currentMode === 'jalali') {
      let nm = this.activeJalali.jm + delta;
      let ny = this.activeJalali.jy;
      if (nm > 12) {
        nm = 1;
        ny++;
      } else if (nm < 1) {
        nm = 12;
        ny--;
      }
      this.activeJalali.jm = nm;
      this.activeJalali.jy = ny;
    } else {
      let nm = this.activeGregorian.gm + delta;
      let ny = this.activeGregorian.gy;
      if (nm > 12) {
        nm = 1;
        ny++;
      } else if (nm < 1) {
        nm = 12;
        ny--;
      }
      this.activeGregorian.gm = nm;
      this.activeGregorian.gy = ny;
    }
    this.renderCalendar();
  }

  jumpToToday() {
    const now = new Date();
    const j = this.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    this.activeJalali = { jy: j.jy, jm: j.jm, jd: j.jd };
    this.activeGregorian = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
    this.selectedDateInfo = null;
    this.renderCalendar();
  }

  renderCalendar() {
    const now = new Date();
    const todayJ = this.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const gDayOfWeek = now.getDay();
    const jDayOfWeekIdx = (gDayOfWeek + 1) % 7;

    // 1. Mode Buttons State
    const btnJalali = document.getElementById('cal-toggle-jalali');
    const btnGreg = document.getElementById('cal-toggle-gregorian');
    if (btnJalali && btnGreg) {
      if (this.currentMode === 'jalali') {
        btnJalali.classList.add('active');
        btnGreg.classList.remove('active');
      } else {
        btnJalali.classList.remove('active');
        btnGreg.classList.add('active');
      }
    }

    // 2. Render Month Title & Grid
    const monthTitleEl = document.getElementById('cal-current-month-title');
    const gridEl = document.getElementById('cal-days-grid');
    const weekdayHeadersEl = document.getElementById('cal-weekday-headers');

    if (this.currentMode === 'jalali') {
      const curMonthName = this.faMonths[this.activeJalali.jm - 1];
      if (monthTitleEl) {
        monthTitleEl.textContent = `${curMonthName} ${this.activeJalali.jy}`;
      }

      // Weekday headers (Shanbeh to Jomeh)
      if (weekdayHeadersEl) {
        weekdayHeadersEl.innerHTML = this.faShortWeekdays.map((w, idx) => `
          <div class="cal-weekday-col ${idx === 6 ? 'is-weekend' : ''}">${w}</div>
        `).join('');
      }

      // Calculate days in active Jalali month
      const totalDays = this.getJalaaliMonthDays(this.activeJalali.jy, this.activeJalali.jm);
      const firstG = this.toGregorian(this.activeJalali.jy, this.activeJalali.jm, 1);
      const firstDate = new Date(firstG.gy, firstG.gm - 1, firstG.gd);
      const startOffset = (firstDate.getDay() + 1) % 7; // 0 for Shanbeh

      let cellsHtml = '';

      // Empty offset cells
      for (let i = 0; i < startOffset; i++) {
        cellsHtml += `<div class="cal-day-cell is-empty"></div>`;
      }

      // Active days
      for (let d = 1; d <= totalDays; d++) {
        const cellG = this.toGregorian(this.activeJalali.jy, this.activeJalali.jm, d);
        const cellDate = new Date(cellG.gy, cellG.gm - 1, cellG.gd);
        const dayOfWeekIdx = (cellDate.getDay() + 1) % 7;
        const isWeekend = dayOfWeekIdx === 6; // Jomeh

        const isToday = (
          this.activeJalali.jy === todayJ.jy &&
          this.activeJalali.jm === todayJ.jm &&
          d === todayJ.jd
        );

        const isSelected = this.selectedDateInfo && (
          this.selectedDateInfo.jy === this.activeJalali.jy &&
          this.selectedDateInfo.jm === this.activeJalali.jm &&
          this.selectedDateInfo.jd === d
        );

        const subText = `${cellG.gd} ${this.enShortMonths[cellG.gm - 1]}`;

        cellsHtml += `
          <div 
            class="cal-day-cell ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}"
            data-jy="${this.activeJalali.jy}"
            data-jm="${this.activeJalali.jm}"
            data-jd="${d}"
            data-gy="${cellG.gy}"
            data-gm="${cellG.gm}"
            data-gd="${cellG.gd}"
            data-weekday="${this.faWeekdays[dayOfWeekIdx]}"
            data-en-weekday="${this.enWeekdays[cellDate.getDay()]}"
            title="${this.faWeekdays[dayOfWeekIdx]}, ${d} ${curMonthName} ↔ ${this.enWeekdays[cellDate.getDay()]}, ${cellG.gd} ${this.enMonths[cellG.gm - 1]}"
          >
            <span class="cal-day-num">${d}</span>
            <span class="cal-day-sub font-mono">${subText}</span>
          </div>
        `;
      }

      if (gridEl) {
        gridEl.innerHTML = cellsHtml;
      }

    } else {
      // Gregorian Mode
      const curMonthName = this.enMonths[this.activeGregorian.gm - 1];
      if (monthTitleEl) {
        monthTitleEl.textContent = `${curMonthName} ${this.activeGregorian.gy}`;
      }

      // Weekday headers (Sunday to Saturday)
      if (weekdayHeadersEl) {
        weekdayHeadersEl.innerHTML = this.enShortWeekdays.map((w, idx) => `
          <div class="cal-weekday-col ${idx === 0 || idx === 6 ? 'is-weekend' : ''}">${w}</div>
        `).join('');
      }

      const totalDays = this.getGregorianMonthDays(this.activeGregorian.gy, this.activeGregorian.gm);
      const firstDate = new Date(this.activeGregorian.gy, this.activeGregorian.gm - 1, 1);
      const startOffset = firstDate.getDay(); // 0 for Sunday

      let cellsHtml = '';

      // Empty offset cells
      for (let i = 0; i < startOffset; i++) {
        cellsHtml += `<div class="cal-day-cell is-empty"></div>`;
      }

      // Active days
      for (let d = 1; d <= totalDays; d++) {
        const cellDate = new Date(this.activeGregorian.gy, this.activeGregorian.gm - 1, d);
        const cellJ = this.toJalaali(this.activeGregorian.gy, this.activeGregorian.gm, d);
        const gDayOfWeek = cellDate.getDay();
        const jDayOfWeekIdx = (gDayOfWeek + 1) % 7;
        const isWeekend = gDayOfWeek === 0 || gDayOfWeek === 6;

        const isToday = (
          this.activeGregorian.gy === now.getFullYear() &&
          this.activeGregorian.gm === (now.getMonth() + 1) &&
          d === now.getDate()
        );

        const isSelected = this.selectedDateInfo && (
          this.selectedDateInfo.gy === this.activeGregorian.gy &&
          this.selectedDateInfo.gm === this.activeGregorian.gm &&
          this.selectedDateInfo.gd === d
        );

        const subText = `${cellJ.jd} ${this.faShortMonths[cellJ.jm - 1]}`;

        cellsHtml += `
          <div 
            class="cal-day-cell ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}"
            data-jy="${cellJ.jy}"
            data-jm="${cellJ.jm}"
            data-jd="${cellJ.jd}"
            data-gy="${this.activeGregorian.gy}"
            data-gm="${this.activeGregorian.gm}"
            data-gd="${d}"
            data-weekday="${this.faWeekdays[jDayOfWeekIdx]}"
            data-en-weekday="${this.enWeekdays[gDayOfWeek]}"
            title="${this.enWeekdays[gDayOfWeek]}, ${d} ${curMonthName} ↔ ${this.faWeekdays[jDayOfWeekIdx]}, ${cellJ.jd} ${this.faMonths[cellJ.jm - 1]}"
          >
            <span class="cal-day-num">${d}</span>
            <span class="cal-day-sub font-mono">${subText}</span>
          </div>
        `;
      }

      if (gridEl) {
        gridEl.innerHTML = cellsHtml;
      }
    }

    // 3. Attach cell click handlers
    if (gridEl) {
      gridEl.querySelectorAll('.cal-day-cell:not(.is-empty)').forEach(cell => {
        cell.onclick = () => {
          gridEl.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('is-selected'));
          cell.classList.add('is-selected');

          const info = {
            jy: parseInt(cell.dataset.jy, 10),
            jm: parseInt(cell.dataset.jm, 10),
            jd: parseInt(cell.dataset.jd, 10),
            gy: parseInt(cell.dataset.gy, 10),
            gm: parseInt(cell.dataset.gm, 10),
            gd: parseInt(cell.dataset.gd, 10),
            weekday: cell.dataset.weekday,
            enWeekday: cell.dataset.enWeekday
          };

          this.selectedDateInfo = info;
          this.renderSelectedInfo(info);
        };
      });
    }

    // 4. Render inspector footer if selected, or default to today
    if (this.selectedDateInfo) {
      this.renderSelectedInfo(this.selectedDateInfo);
    } else {
      this.renderSelectedInfo({
        jy: todayJ.jy,
        jm: todayJ.jm,
        jd: todayJ.jd,
        gy: now.getFullYear(),
        gm: now.getMonth() + 1,
        gd: now.getDate(),
        weekday: this.faWeekdays[jDayOfWeekIdx],
        enWeekday: this.enWeekdays[gDayOfWeek]
      });
    }
  }

  renderSelectedInfo(info) {
    const inspectorEl = document.getElementById('cal-selected-inspector');
    if (!inspectorEl) return;

    const faStr = `${info.weekday}, ${info.jd} ${this.faMonths[info.jm - 1]} ${info.jy}`;
    const enStr = `${info.enWeekday}, ${info.gd} ${this.enMonths[info.gm - 1]} ${info.gy}`;

    inspectorEl.innerHTML = `
      <div class="inspector-item">
        <span class="inspector-label font-mono">SHAMSI:</span>
        <span class="inspector-val">${faStr}</span>
      </div>
      <div class="inspector-divider">↔</div>
      <div class="inspector-item">
        <span class="inspector-label font-mono">GREGORIAN:</span>
        <span class="inspector-val">${enStr}</span>
      </div>
    `;
  }
}

window.dualCalendar = new DualCalendarEngine();
