// Weather Engine (Open-Meteo — Privacy-First, 7-Day Forecast, Dynamic City Search)

class WeatherEngine {
  constructor() {
    this.cacheKey = 'hermes_weather_data_v2';
    this.coordsKey = 'hermes_weather_coords';
    this.cacheTtl = 15 * 60 * 1000; // 15 minutes
    
    // Default to Karaj, Iran
    this.defaultCoords = { lat: 35.8327, lon: 50.9915, city: 'Karaj', country: 'Iran' };
    this.currentCoords = this.loadSavedCoords();

    this.pillEl = document.getElementById('weather-pill');
    this.iconEl = document.getElementById('weather-icon');
    this.tempEl = document.getElementById('weather-temp');
    this.cityEl = document.getElementById('weather-city');

    this.modalEl = document.getElementById('weather-modal');
    this.closeBtn = document.getElementById('btn-close-weather');
    this.searchInput = document.getElementById('city-search-input');
    this.suggestionsEl = document.getElementById('city-suggestions');
    this.currentBannerEl = document.getElementById('weather-current-banner');
    this.weeklyGridEl = document.getElementById('weekly-forecast-grid');
    this.quickCityPills = document.querySelectorAll('.quick-city-pill');
  }

  loadSavedCoords() {
    try {
      const saved = localStorage.getItem(this.coordsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lat && parsed.lon) return parsed;
      }
    } catch {}
    return this.defaultCoords;
  }

  saveCoords(coords) {
    this.currentCoords = coords;
    try {
      localStorage.setItem(this.coordsKey, JSON.stringify(coords));
    } catch {}
  }

  async init() {
    this.refreshElements();
    this.setupListeners();

    // 1. Instant paint from cache
    const cached = this.getCached();
    if (cached) {
      this.renderWeather(cached);
      this.renderModalContent(cached);
    }

    // 2. Fetch fresh weather in background
    if (!cached || (Date.now() - cached.timestamp > this.cacheTtl) || cached.city !== this.currentCoords.city) {
      await this.fetchWeather();
    }
  }

  refreshElements() {
    this.pillEl = document.getElementById('weather-pill');
    this.iconEl = document.getElementById('weather-icon');
    this.tempEl = document.getElementById('weather-temp');
    this.cityEl = document.getElementById('weather-city');
    this.modalEl = document.getElementById('weather-modal');
    this.closeBtn = document.getElementById('btn-close-weather');
    this.searchInput = document.getElementById('city-search-input');
    this.suggestionsEl = document.getElementById('city-suggestions');
    this.currentBannerEl = document.getElementById('weather-current-banner');
    this.weeklyGridEl = document.getElementById('weekly-forecast-grid');
    this.quickCityPills = document.querySelectorAll('.quick-city-pill');
  }

  getCached() {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveCache(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch {}
  }

  async fetchWeather() {
    try {
      const coords = this.currentCoords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return;
      const json = await res.json();
      const current = json.current;
      const daily = json.daily;
      if (!current) return;

      const dailyForecast = [];
      if (daily && Array.isArray(daily.time)) {
        for (let i = 0; i < daily.time.length; i++) {
          const dateObj = new Date(daily.time[i] + 'T00:00:00');
          const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          dailyForecast.push({
            date: daily.time[i],
            dayName: dayName,
            code: daily.weather_code[i],
            maxTemp: Math.round(daily.temperature_2m_max[i]),
            minTemp: Math.round(daily.temperature_2m_min[i]),
            rainChance: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0
          });
        }
      }

      const weatherData = {
        city: coords.city,
        country: coords.country || 'Location',
        temp: Math.round(current.temperature_2m),
        apparentTemp: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        isDay: current.is_day === 1,
        code: current.weather_code,
        daily: dailyForecast
      };

      this.saveCache(weatherData);
      this.renderWeather(weatherData);
      this.renderModalContent(weatherData);
    } catch (e) {
      console.warn('Weather fetch skipped:', e);
    }
  }

  getWeatherDetails(code, isDay = true) {
    if (code === 0) return { label: 'Clear Sky', icon: isDay ? 'sun' : 'moon' };
    if (code === 1 || code === 2) return { label: 'Partly Cloudy', icon: isDay ? 'cloudSun' : 'moon' };
    if (code === 3) return { label: 'Overcast', icon: 'cloud' };
    if (code === 45 || code === 48) return { label: 'Fog / Mist', icon: 'cloud' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: 'Rain', icon: 'cloudRain' };
    if ([71, 73, 75, 85, 86].includes(code)) return { label: 'Snow', icon: 'cloudSnow' };
    if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: 'cloudLightning' };
    return { label: 'Clear', icon: isDay ? 'sun' : 'moon' };
  }

  renderWeather(data) {
    const details = this.getWeatherDetails(data.code, data.isDay);

    if (this.tempEl) {
      this.tempEl.textContent = `${data.temp}°C`;
    }
    if (this.cityEl) {
      this.cityEl.textContent = `${data.city} • ${details.label}`;
    }
    if (this.iconEl && typeof ICONS !== 'undefined') {
      this.iconEl.innerHTML = ICONS[details.icon] || ICONS.sun;
    }
  }

  renderModalContent(data) {
    this.refreshElements();
    if (!data) return;

    const details = this.getWeatherDetails(data.code, data.isDay);

    // Render Current Banner
    if (this.currentBannerEl) {
      const iconHtml = (typeof ICONS !== 'undefined' && ICONS[details.icon]) ? ICONS[details.icon] : '';
      const todayRain = (data.daily && data.daily[0]) ? data.daily[0].rainChance : 0;

      this.currentBannerEl.innerHTML = `
        <div class="current-banner-left">
          <div class="current-banner-temp">${data.temp}°C</div>
          <div class="current-banner-info">
            <div class="current-banner-city">${data.city}, ${data.country}</div>
            <div class="current-banner-desc">${details.label} • Feels like ${data.apparentTemp}°C</div>
          </div>
        </div>
        <div class="current-banner-metrics">
          <div>💧 Humidity: <b>${data.humidity}%</b></div>
          <div>💨 Wind: <b>${data.windSpeed} km/h</b></div>
          <div>🌧 Rain Chance: <b>${todayRain}%</b></div>
        </div>
      `;
    }

    // Render 7-Day Forecast Grid
    if (this.weeklyGridEl && data.daily && Array.isArray(data.daily)) {
      this.weeklyGridEl.innerHTML = data.daily.map((d, idx) => {
        const dDetails = this.getWeatherDetails(d.code, true);
        const iconSvg = (typeof ICONS !== 'undefined' && ICONS[dDetails.icon]) ? ICONS[dDetails.icon] : '';
        const isToday = idx === 0 ? 'today' : '';
        const rainBadge = d.rainChance > 0 
          ? `<span class="rain-chance-badge">${d.rainChance}%</span>` 
          : `<span style="font-size:0.6rem;opacity:0.3;">0%</span>`;

        return `
          <div class="forecast-day-card ${isToday}">
            <span class="forecast-day-name">${d.dayName}</span>
            <div class="forecast-day-icon">${iconSvg}</div>
            <div class="forecast-day-temps">${d.maxTemp}° <span class="forecast-min-temp">${d.minTemp}°</span></div>
            ${rainBadge}
          </div>
        `;
      }).join('');
    }

    // Update Quick City Pill Active State
    if (this.quickCityPills) {
      this.quickCityPills.forEach(pill => {
        if (pill.dataset.city.toLowerCase() === data.city.toLowerCase()) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }
  }

  setupListeners() {
    this.refreshElements();

    // 1. Open Modal on Weather Pill Click
    if (this.pillEl) {
      this.pillEl.addEventListener('click', () => {
        this.openModal();
      });
    }

    // 2. Close Modal Handlers
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl && this.modalEl.classList.contains('active')) {
        this.closeModal();
      }
    });

    // 3. Quick City Pills Click
    if (this.quickCityPills) {
      this.quickCityPills.forEach(pill => {
        pill.addEventListener('click', async () => {
          const newCoords = {
            lat: parseFloat(pill.dataset.lat),
            lon: parseFloat(pill.dataset.lon),
            city: pill.dataset.city,
            country: 'Iran'
          };
          this.saveCoords(newCoords);
          await this.fetchWeather();
        });
      });
    }

    // 4. City Search & Geocoding Autocomplete
    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
          this.hideSuggestions();
          return;
        }
        debounceTimer = setTimeout(() => this.searchCities(query), 300);
      });
    }
  }

  openModal() {
    this.refreshElements();
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      const cached = this.getCached();
      if (cached) this.renderModalContent(cached);
      if (this.searchInput) {
        setTimeout(() => this.searchInput.focus(), 100);
      }
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
      this.hideSuggestions();
      if (this.searchInput) this.searchInput.value = '';
    }
  }

  async searchCities(query) {
    if (!this.suggestionsEl) return;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const results = json.results || [];

      if (results.length === 0) {
        this.suggestionsEl.innerHTML = `<div class="city-suggestion-item" style="color:var(--text-muted);">No cities found</div>`;
        this.suggestionsEl.classList.add('active');
        return;
      }

      this.suggestionsEl.innerHTML = results.map(r => `
        <div class="city-suggestion-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-city="${r.name}" data-country="${r.country || ''}">
          <b>${r.name}</b> <span style="color:var(--text-muted);font-size:0.7rem;">${r.admin1 ? r.admin1 + ', ' : ''}${r.country || ''}</span>
        </div>
      `).join('');

      this.suggestionsEl.classList.add('active');

      this.suggestionsEl.querySelectorAll('.city-suggestion-item').forEach(item => {
        item.addEventListener('click', async () => {
          if (!item.dataset.lat) return;
          const newCoords = {
            lat: parseFloat(item.dataset.lat),
            lon: parseFloat(item.dataset.lon),
            city: item.dataset.city,
            country: item.dataset.country
          };
          this.saveCoords(newCoords);
          this.hideSuggestions();
          if (this.searchInput) this.searchInput.value = '';
          await this.fetchWeather();
        });
      });
    } catch (e) {
      console.warn('Geocoding search error:', e);
    }
  }

  hideSuggestions() {
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.remove('active');
      this.suggestionsEl.innerHTML = '';
    }
  }
}

window.weatherEngine = new WeatherEngine();
