// Weather Widget Engine (Open-Meteo — Fast, Privacy-First, Zero API Key)

class WeatherEngine {
  constructor() {
    this.cacheKey = 'hermes_weather_data';
    this.cacheTtl = 20 * 60 * 1000; // 20 minutes
    this.defaultCoords = { lat: 35.6892, lon: 51.3890, city: 'Tehran' };

    this.pillEl = document.getElementById('weather-pill');
    this.iconEl = document.getElementById('weather-icon');
    this.tempEl = document.getElementById('weather-temp');
    this.cityEl = document.getElementById('weather-city');
  }

  async init() {
    if (!this.pillEl) return;

    this.setupClickListener();

    // 1. Instant paint from local cache
    const cached = this.getCached();
    if (cached) {
      this.renderWeather(cached);
    }

    // 2. Refresh in background if cache is stale or missing
    if (!cached || (Date.now() - cached.timestamp > this.cacheTtl)) {
      await this.fetchWeather();
    }
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
      let coords = this.defaultCoords;

      // Try browser geolocation if permitted
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          if (pos && pos.coords) {
            coords = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              city: 'Local'
            };
          }
        } catch {}
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return;
      const json = await res.json();
      const current = json.current;
      if (!current) return;

      const weatherData = {
        city: coords.city,
        temp: Math.round(current.temperature_2m),
        apparentTemp: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        isDay: current.is_day === 1,
        code: current.weather_code
      };

      this.saveCache(weatherData);
      this.renderWeather(weatherData);
    } catch (e) {
      console.warn('Weather fetch skipped:', e);
    }
  }

  getWeatherDetails(code, isDay) {
    // WMO Weather interpretation codes
    if (code === 0) {
      return { label: 'Clear', icon: isDay ? 'sun' : 'moon' };
    }
    if (code === 1 || code === 2) {
      return { label: 'Partly Cloudy', icon: isDay ? 'cloudSun' : 'moon' };
    }
    if (code === 3) {
      return { label: 'Overcast', icon: 'cloud' };
    }
    if (code === 45 || code === 48) {
      return { label: 'Fog / Mist', icon: 'cloud' };
    }
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      return { label: 'Rain', icon: 'cloudRain' };
    }
    if ([71, 73, 75, 85, 86].includes(code)) {
      return { label: 'Snow', icon: 'cloudSnow' };
    }
    if ([95, 96, 99].includes(code)) {
      return { label: 'Thunderstorm', icon: 'cloudLightning' };
    }
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
    if (this.pillEl) {
      this.pillEl.title = `Weather: ${details.label} (${data.temp}°C)\nFeels like: ${data.apparentTemp}°C\nHumidity: ${data.humidity}%\nWind: ${data.windSpeed} km/h\n(Click to refresh)`;
    }
  }

  setupClickListener() {
    if (this.pillEl) {
      this.pillEl.addEventListener('click', async () => {
        if (this.iconEl) {
          this.iconEl.style.transform = 'rotate(360deg)';
          this.iconEl.style.transition = 'transform 500ms ease';
        }
        await this.fetchWeather();
        setTimeout(() => {
          if (this.iconEl) {
            this.iconEl.style.transform = 'none';
            this.iconEl.style.transition = 'none';
          }
        }, 500);
      });
    }
  }
}

window.weatherEngine = new WeatherEngine();
