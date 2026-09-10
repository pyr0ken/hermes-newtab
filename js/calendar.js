// Hermes NewTab — Dual Calendar Engine with Holidays & Occasions (Persian Fingilish & Gregorian)

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

    // --- Holidays & Occasions Database ---
    this.initEventsDatabase();
  }

  initEventsDatabase() {
    // 1. Fixed Solar Hijri Events (Shamsi)
    this.shamsiEvents = {
      // Farvardin
      '1-1': { title: "Eid-e Nowruz", holiday: true },
      '1-2': { title: "Eid-e Nowruz", holiday: true },
      '1-3': { title: "Eid-e Nowruz", holiday: true },
      '1-4': { title: "Eid-e Nowruz", holiday: true },
      '1-6': { title: "Zadruz-e Zartosht / Ruz-e Omid", holiday: false },
      '1-12': { title: "Ruz-e Jomhuri-e Eslami", holiday: true },
      '1-13': { title: "Sizdah Be-dar (Ruz-e Tabi'at)", holiday: true },
      '1-18': { title: "Ruz-e Salamati (World Health Day)", holiday: false },
      '1-25': { title: "Bozorgdasht-e Attar Neyshabouri", holiday: false },
      '1-29': { title: "Ruz-e Artesh-e Jomhuri-e Eslami", holiday: false },

      // Ordibehesht
      '2-1': { title: "Bozorgdasht-e Saadi", holiday: false },
      '2-2': { title: "Jashn-e Ordibeheshtgan / Earth Day", holiday: false },
      '2-3': { title: "Bozorgdasht-e Sheikh Bahaee / Ruz-e Me'mari", holiday: false },
      '2-10': { title: "Ruz-e Melli-e Khalij-e Fars", holiday: false },
      '2-11': { title: "Ruz-e Jahani-e Kargar (Labor Day)", holiday: false },
      '2-12': { title: "Ruz-e Mo'allem", holiday: false },
      '2-15': { title: "Jashn-e Miyaneh-ye Bahar / Ruz-e Shiraz", holiday: false },
      '2-25': { title: "Bozorgdasht-e Ferdowsi & Zaban-e Farsi", holiday: false },
      '2-28': { title: "Bozorgdasht-e Hakim Omar Khayyam", holiday: false },

      // Khordad
      '3-1': { title: "Bozorgdasht-e Mulla Sadra", holiday: false },
      '3-3': { title: "Azadsazi-e Khorramshahr", holiday: false },
      '3-14': { title: "Rehelat-e Imam Khomeini", holiday: true },
      '3-15': { title: "Ghiyam-e 15 Khordad", holiday: true },
      '3-25': { title: "Ruz-e Melli-e Gol o Giah", holiday: false },

      // Tir
      '4-1': { title: "Jashn-e Ab-pashan / Aghaz-e Tabestan", holiday: false },
      '4-7': { title: "Shahadat-e Ayatollah Beheshti (7 Tir)", holiday: false },
      '4-10': { title: "Jashn-e Tirgan", holiday: false },
      '4-14': { title: "Ruz-e Qalam", holiday: false },

      // Mordad
      '5-8': { title: "Bozorgdasht-e Sheikh Shahaboddin Sohravardi", holiday: false },
      '5-10': { title: "Jashn-e Chelleh-ye Tabestan", holiday: false },
      '5-14': { title: "Sodor-e Farman-e Mashrooteh", holiday: false },
      '5-17': { title: "Ruz-e Khabarnegar", holiday: false },
      '5-28': { title: "Koodeta-ye 28 Mordad", holiday: false },

      // Shahrivar
      '6-1': { title: "Ruz-e Pezeshk / Bozorgdasht-e Avicenna", holiday: false },
      '6-4': { title: "Jashn-e Shahrivargan / Ruz-e Karmand", holiday: false },
      '6-5': { title: "Ruz-e Darusazi / Bozorgdasht-e Zakariya Razi", holiday: false },
      '6-13': { title: "Bozorgdasht-e Aboureyhan Biruni", holiday: false },
      '6-21': { title: "Ruz-e Cinema", holiday: false },
      '6-27': { title: "Ruz-e Sher o Adab-e Farsi / Shahriar", holiday: false },
      '6-31': { title: "Aghaz-e Hafteh-ye Defa-e Moghaddas", holiday: false },

      // Mehr
      '7-1': { title: "Aghaz-e Paeez / Bazgoshayee-e Madares", holiday: false },
      '7-7': { title: "Ruz-e Atash-neshani o Emdad", holiday: false },
      '7-8': { title: "Bozorgdasht-e Mowlana (Rumi)", holiday: false },
      '7-10': { title: "Jashn-e Mehregan", holiday: false },
      '7-14': { title: "Ruz-e Dampezeshki", holiday: false },
      '7-16': { title: "Ruz-e Jahani-e Koudak", holiday: false },
      '7-20': { title: "Bozorgdasht-e Hafez", holiday: false },

      // Aban
      '8-1': { title: "Bozorgdasht-e Abou-l-Fazl Beyhaqi", holiday: false },
      '8-7': { title: "Ruz-e Kourosh-e Bozorg (Cyrus Day)", holiday: false },
      '8-8': { title: "Ruz-e Nojavan o Basij-e Danesh-amouzi", holiday: false },
      '8-10': { title: "Jashn-e Abangan", holiday: false },
      '8-13': { title: "Ruz-e Danesh-amouz", holiday: false },
      '8-24': { title: "Ruz-e Ketab o Ketabkhani", holiday: false },

      // Azar
      '9-9': { title: "Jashn-e Azargan", holiday: false },
      '9-16': { title: "Ruz-e Daneshjou", holiday: false },
      '9-25': { title: "Ruz-e Pazhouhesh", holiday: false },
      '9-30': { title: "Shab-e Yalda (Chelle)", holiday: false },

      // Dey
      '10-1': { title: "Jashn-e Khorram-ruz / Aghaz-e Zemestan", holiday: false },
      '10-5': { title: "Zamin-larzeh-ye Bam / Ruz-e Imeni", holiday: false },
      '10-10': { title: "Jashn-e Deygan", holiday: false },
      '10-20': { title: "Shahadat-e Mirza Taghi Khan Amir Kabir", holiday: false },

      // Bahman
      '11-1': { title: "Zadruz-e Ferdowsi", holiday: false },
      '11-10': { title: "Jashn-e Sadeh", holiday: false },
      '11-12': { title: "Bazgasht-e Imam Khomeini be Iran", holiday: false },
      '11-22': { title: "Piroozi-e Enghelab-e Eslami", holiday: true },
      '11-29': { title: "Jashn-e Sepandarmazgan (Ruz-e Eshgh)", holiday: false },

      // Esfand
      '12-5': { title: "Bozorgdasht-e Khajeh Nasir / Ruz-e Mohandes", holiday: false },
      '12-14': { title: "Ruz-e Ehsan o Nikookari", holiday: false },
      '12-15': { title: "Ruz-e Derakht-kari (Arbor Day)", holiday: false },
      '12-25': { title: "Payan-e Sorayesh-e Shahnameh", holiday: false },
      '12-29': { title: "Melli Shodan-e San'at-e Naft", holiday: true }
    };

    // 2. Moving Lunar Hijri Holidays Map for 1403 - 1407
    this.lunarEvents = {
      '1403': {
        '1-22': { title: "Eid-e Saeed-e Fetr", holiday: true },
        '1-23': { title: "Ta'til-e Eid-e Fetr", holiday: true },
        '2-15': { title: "Shahadat-e Imam Ja'far Sadegh", holiday: true },
        '3-28': { title: "Eid-e Saeed-e Qorban", holiday: true },
        '4-5': { title: "Eid-e Saeed-e Ghadir Khumm", holiday: true },
        '4-25': { title: "Tasu'a-ye Hosseini", holiday: true },
        '4-26': { title: "Ashura-ye Hosseini", holiday: true },
        '6-4': { title: "Arba'een-e Hosseini", holiday: true },
        '6-12': { title: "Rehelat-e Payambar & Shahadat-e Imam Hasan", holiday: true },
        '6-14': { title: "Shahadat-e Imam Reza", holiday: true },
        '6-22': { title: "Shahadat-e Imam Hasan Askari", holiday: true },
        '6-31': { title: "Milad-e Payambar & Imam Sadegh", holiday: true },
        '9-15': { title: "Shahadat-e Hazrat-e Fatima", holiday: true },
        '10-25': { title: "Milad-e Imam Ali / Ruz-e Pedar", holiday: true },
        '11-9': { title: "Mab'ath-e Hazrat-e Rasool", holiday: true },
        '11-26': { title: "Milad-e Imam Zaman (Nimeh-ye Sha'ban)", holiday: true }
      },
      '1404': {
        '1-11': { title: "Eid-e Saeed-e Fetr", holiday: true },
        '1-12': { title: "Ta'til-e Eid-e Fetr", holiday: true },
        '2-4': { title: "Shahadat-e Imam Ja'far Sadegh", holiday: true },
        '3-16': { title: "Eid-e Saeed-e Qorban", holiday: true },
        '3-24': { title: "Eid-e Saeed-e Ghadir Khumm", holiday: true },
        '4-14': { title: "Tasu'a-ye Hosseini", holiday: true },
        '4-15': { title: "Ashura-ye Hosseini", holiday: true },
        '5-24': { title: "Arba'een-e Hosseini", holiday: true },
        '6-1': { title: "Rehelat-e Payambar & Shahadat-e Imam Hasan", holiday: true },
        '6-3': { title: "Shahadat-e Imam Reza", holiday: true },
        '6-12': { title: "Shahadat-e Imam Hasan Askari", holiday: true },
        '6-21': { title: "Milad-e Payambar & Imam Sadegh", holiday: true },
        '9-3': { title: "Shahadat-e Hazrat-e Fatima", holiday: true },
        '10-14': { title: "Milad-e Imam Ali / Ruz-e Pedar", holiday: true },
        '10-27': { title: "Mab'ath-e Hazrat-e Rasool", holiday: true },
        '11-15': { title: "Milad-e Imam Zaman (Nimeh-ye Sha'ban)", holiday: true },
        '12-20': { title: "Shahadat-e Hazrat-e Ali", holiday: true },
        '12-30': { title: "Eid-e Saeed-e Fetr", holiday: true }
      },
      '1405': {
        '1-1': { title: "Ta'til-e Eid-e Fetr", holiday: true },
        '1-23': { title: "Shahadat-e Imam Ja'far Sadegh", holiday: true },
        '3-5': { title: "Eid-e Saeed-e Qorban", holiday: true },
        '3-13': { title: "Eid-e Saeed-e Ghadir Khumm", holiday: true },
        '4-3': { title: "Tasu'a-ye Hosseini", holiday: true },
        '4-4': { title: "Ashura-ye Hosseini", holiday: true },
        '5-13': { title: "Arba'een-e Hosseini", holiday: true },
        '5-21': { title: "Rehelat-e Payambar & Shahadat-e Imam Hasan", holiday: true },
        '5-23': { title: "Shahadat-e Imam Reza", holiday: true },
        '6-1': { title: "Shahadat-e Imam Hasan Askari", holiday: true },
        '6-10': { title: "Milad-e Payambar & Imam Sadegh", holiday: true },
        '8-23': { title: "Shahadat-e Hazrat-e Fatima", holiday: true },
        '10-4': { title: "Milad-e Imam Ali / Ruz-e Pedar", holiday: true },
        '10-17': { title: "Mab'ath-e Hazrat-e Rasool", holiday: true },
        '11-5': { title: "Milad-e Imam Zaman (Nimeh-ye Sha'ban)", holiday: true },
        '12-10': { title: "Shahadat-e Hazrat-e Ali", holiday: true },
        '12-19': { title: "Eid-e Saeed-e Fetr", holiday: true },
        '12-20': { title: "Ta'til-e Eid-e Fetr", holiday: true }
      },
      '1406': {
        '1-12': { title: "Shahadat-e Imam Ja'far Sadegh", holiday: true },
        '2-26': { title: "Eid-e Saeed-e Qorban", holiday: true },
        '3-3': { title: "Eid-e Saeed-e Ghadir Khumm", holiday: true },
        '3-23': { title: "Tasu'a-ye Hosseini", holiday: true },
        '3-24': { title: "Ashura-ye Hosseini", holiday: true },
        '5-2': { title: "Arba'een-e Hosseini", holiday: true },
        '5-10': { title: "Rehelat-e Payambar & Shahadat-e Imam Hasan", holiday: true },
        '5-12': { title: "Shahadat-e Imam Reza", holiday: true },
        '5-21': { title: "Shahadat-e Imam Hasan Askari", holiday: true },
        '5-30': { title: "Milad-e Payambar & Imam Sadegh", holiday: true },
        '8-12': { title: "Shahadat-e Hazrat-e Fatima", holiday: true },
        '9-23': { title: "Milad-e Imam Ali / Ruz-e Pedar", holiday: true },
        '10-6': { title: "Mab'ath-e Hazrat-e Rasool", holiday: true },
        '10-24': { title: "Milad-e Imam Zaman (Nimeh-ye Sha'ban)", holiday: true },
        '11-28': { title: "Shahadat-e Hazrat-e Ali", holiday: true },
        '12-8': { title: "Eid-e Saeed-e Fetr", holiday: true },
        '12-9': { title: "Ta'til-e Eid-e Fetr", holiday: true }
      }
    };

    // 3. International Gregorian Events
    this.gregorianEvents = {
      '1-1': { title: "New Year's Day", holiday: false },
      '2-14': { title: "Valentine's Day", holiday: false },
      '3-8': { title: "International Women's Day", holiday: false },
      '3-14': { title: "Pi Day (3.14)", holiday: false },
      '4-22': { title: "Earth Day", holiday: false },
      '5-1': { title: "International Workers' Day", holiday: false },
      '6-5': { title: "World Environment Day", holiday: false },
      '10-31': { title: "Halloween", holiday: false },
      '12-25': { title: "Christmas Day", holiday: false },
      '12-31': { title: "New Year's Eve", holiday: false }
    };
  }

  getEventsForDate(jy, jm, jd, gy, gm, gd) {
    const list = [];
    const shKey = `${jm}-${jd}`;

    // 1. Fixed Shamsi
    if (this.shamsiEvents[shKey]) {
      list.push(this.shamsiEvents[shKey]);
    }

    // 2. Moving Lunar
    const yrStr = String(jy);
    if (this.lunarEvents[yrStr] && this.lunarEvents[yrStr][shKey]) {
      list.push(this.lunarEvents[yrStr][shKey]);
    }

    // 3. Gregorian
    const grKey = `${gm}-${gd}`;
    if (this.gregorianEvents[grKey]) {
      list.push(this.gregorianEvents[grKey]);
    }

    return list;
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
        const isFriday = dayOfWeekIdx === 6; // Jomeh

        // Check events & holiday status
        const events = this.getEventsForDate(this.activeJalali.jy, this.activeJalali.jm, d, cellG.gy, cellG.gm, cellG.gd);
        const isHoliday = isFriday || events.some(e => e.holiday);
        const hasOccasion = events.length > 0;

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
        const eventDotHtml = hasOccasion 
          ? `<span class="cal-event-dot ${events.some(e => e.holiday) ? 'is-holiday-dot' : ''}"></span>` 
          : '';

        const eventTitles = events.map(e => e.title + (e.holiday ? ' (Ta\'til)' : '')).join(' • ');
        const tooltipStr = `${this.faWeekdays[dayOfWeekIdx]}, ${d} ${curMonthName}${eventTitles ? ' — ' + eventTitles : ''}`;

        cellsHtml += `
          <div 
            class="cal-day-cell ${isHoliday ? 'is-holiday' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}"
            data-jy="${this.activeJalali.jy}"
            data-jm="${this.activeJalali.jm}"
            data-jd="${d}"
            data-gy="${cellG.gy}"
            data-gm="${cellG.gm}"
            data-gd="${cellG.gd}"
            data-weekday="${this.faWeekdays[dayOfWeekIdx]}"
            data-en-weekday="${this.enWeekdays[cellDate.getDay()]}"
            data-events="${this.escapeHtml(JSON.stringify(events))}"
            title="${this.escapeHtml(tooltipStr)}"
          >
            <span class="cal-day-num">${d}</span>
            <span class="cal-day-sub font-mono">${subText}</span>
            ${eventDotHtml}
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
        const isSunday = gDayOfWeek === 0;

        const events = this.getEventsForDate(cellJ.jy, cellJ.jm, cellJ.jd, this.activeGregorian.gy, this.activeGregorian.gm, d);
        const isHoliday = isSunday || jDayOfWeekIdx === 6 || events.some(e => e.holiday);
        const hasOccasion = events.length > 0;

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
        const eventDotHtml = hasOccasion 
          ? `<span class="cal-event-dot ${events.some(e => e.holiday) ? 'is-holiday-dot' : ''}"></span>` 
          : '';

        const eventTitles = events.map(e => e.title + (e.holiday ? ' (Holiday)' : '')).join(' • ');
        const tooltipStr = `${this.enWeekdays[gDayOfWeek]}, ${d} ${curMonthName}${eventTitles ? ' — ' + eventTitles : ''}`;

        cellsHtml += `
          <div 
            class="cal-day-cell ${isHoliday ? 'is-holiday' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}"
            data-jy="${cellJ.jy}"
            data-jm="${cellJ.jm}"
            data-jd="${cellJ.jd}"
            data-gy="${this.activeGregorian.gy}"
            data-gm="${this.activeGregorian.gm}"
            data-gd="${d}"
            data-weekday="${this.faWeekdays[jDayOfWeekIdx]}"
            data-en-weekday="${this.enWeekdays[gDayOfWeek]}"
            data-events="${this.escapeHtml(JSON.stringify(events))}"
            title="${this.escapeHtml(tooltipStr)}"
          >
            <span class="cal-day-num">${d}</span>
            <span class="cal-day-sub font-mono">${subText}</span>
            ${eventDotHtml}
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

          let events = [];
          try {
            events = JSON.parse(cell.dataset.events || '[]');
          } catch {}

          const info = {
            jy: parseInt(cell.dataset.jy, 10),
            jm: parseInt(cell.dataset.jm, 10),
            jd: parseInt(cell.dataset.jd, 10),
            gy: parseInt(cell.dataset.gy, 10),
            gm: parseInt(cell.dataset.gm, 10),
            gd: parseInt(cell.dataset.gd, 10),
            weekday: cell.dataset.weekday,
            enWeekday: cell.dataset.enWeekday,
            events: events
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
      const todayEvents = this.getEventsForDate(todayJ.jy, todayJ.jm, todayJ.jd, now.getFullYear(), now.getMonth() + 1, now.getDate());
      this.renderSelectedInfo({
        jy: todayJ.jy,
        jm: todayJ.jm,
        jd: todayJ.jd,
        gy: now.getFullYear(),
        gm: now.getMonth() + 1,
        gd: now.getDate(),
        weekday: this.faWeekdays[jDayOfWeekIdx],
        enWeekday: this.enWeekdays[gDayOfWeek],
        events: todayEvents
      });
    }
  }

  renderSelectedInfo(info) {
    const inspectorEl = document.getElementById('cal-selected-inspector');
    if (!inspectorEl) return;

    const faStr = `${info.weekday}, ${info.jd} ${this.faMonths[info.jm - 1]} ${info.jy}`;
    const enStr = `${info.enWeekday}, ${info.gd} ${this.enMonths[info.gm - 1]} ${info.gy}`;

    let eventsHtml = '';
    if (info.events && info.events.length > 0) {
      eventsHtml = `
        <div class="cal-inspector-events">
          ${info.events.map(e => `
            <span class="cal-event-pill ${e.holiday ? 'is-holiday-badge' : ''}">
              ${e.holiday ? '🛑' : '✨'} ${this.escapeHtml(e.title)} ${e.holiday ? '<span class="holiday-tag font-mono">[TA\'TIL]</span>' : ''}
            </span>
          `).join('')}
        </div>
      `;
    }

    inspectorEl.innerHTML = `
      <div class="cal-inspector-dates">
        <div class="inspector-item">
          <span class="inspector-label font-mono">SHAMSI:</span>
          <span class="inspector-val">${faStr}</span>
        </div>
        <div class="inspector-divider">↔</div>
        <div class="inspector-item">
          <span class="inspector-label font-mono">GREGORIAN:</span>
          <span class="inspector-val">${enStr}</span>
        </div>
      </div>
      ${eventsHtml}
    `;
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

window.dualCalendar = new DualCalendarEngine();
