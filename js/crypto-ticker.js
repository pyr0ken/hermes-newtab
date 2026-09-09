// Live Crypto & Market Ticker Engine

class CryptoTicker {
  constructor() {
    this.cacheKey = 'hermes_crypto_data';
    this.cacheTtl = 2 * 60 * 1000; // 2 minutes
    this.apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd&include_24hr_change=true';
    
    this.gridEl = document.getElementById('crypto-grid');
    this.refreshBtn = document.getElementById('btn-refresh-crypto');
    this.pollInterval = 60 * 1000; // 60s
    this.timer = null;
  }

  async init() {
    this.gridEl = document.getElementById('crypto-grid');
    this.refreshBtn = document.getElementById('btn-refresh-crypto');
    if (!this.gridEl) return;

    this.setupListeners();

    // 1. Instant paint from cache
    const cached = this.getCached();
    if (cached) {
      this.render(cached);
    } else {
      this.renderDefaultPlaceholders();
    }

    // 2. Fetch fresh data
    if (!cached || (Date.now() - cached.timestamp > this.cacheTtl)) {
      await this.fetchPrices();
    }

    // 3. Periodic Background Refresh
    this.timer = setInterval(() => this.fetchPrices(), this.pollInterval);
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
      localStorage.setItem(this.cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  }

  renderDefaultPlaceholders() {
    if (!this.gridEl) return;
    const defaults = [
      { symbol: 'BTC', name: 'Bitcoin', price: '$--', change: 0, url: 'https://www.tradingview.com/symbols/BTCUSD/' },
      { symbol: 'ETH', name: 'Ethereum', price: '$--', change: 0, url: 'https://www.tradingview.com/symbols/ETHUSD/' },
      { symbol: 'SOL', name: 'Solana', price: '$--', change: 0, url: 'https://www.tradingview.com/symbols/SOLUSD/' },
      { symbol: 'USDT', name: 'Tether', price: '$1.00', change: 0, url: 'https://www.tradingview.com/symbols/USDTUSD/' }
    ];
    this.renderItems(defaults);
  }

  async fetchPrices() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(this.apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return;
      const json = await res.json();
      if (!json || typeof json !== 'object') return;

      const assets = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: json.bitcoin ? `$${json.bitcoin.usd.toLocaleString('en-US')}` : '$--',
          change: json.bitcoin ? Number(json.bitcoin.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/BTCUSD/'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: json.ethereum ? `$${json.ethereum.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          change: json.ethereum ? Number(json.ethereum.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/ETHUSD/'
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: json.solana ? `$${json.solana.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          change: json.solana ? Number(json.solana.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/SOLUSD/'
        },
        {
          symbol: 'USDT',
          name: 'Tether',
          price: json.tether ? `$${json.tether.usd.toFixed(3)}` : '$1.00',
          change: json.tether ? Number(json.tether.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/USDTUSD/'
        }
      ];

      this.saveCache(assets);
      this.render({ data: assets });
    } catch (e) {
      console.warn('Crypto ticker fetch skipped:', e);
    }
  }

  render(payload) {
    if (!payload || !Array.isArray(payload.data)) return;
    this.renderItems(payload.data);
  }

  renderItems(items) {
    if (!this.gridEl) return;

    this.gridEl.innerHTML = items.map(item => {
      const isPos = item.change >= 0;
      const sign = isPos ? '+' : '';
      const badgeClass = isPos ? 'positive' : 'negative';

      return `
        <a href="${item.url}" target="_blank" class="ticker-item" title="View ${item.name} chart on TradingView">
          <div class="ticker-top">
            <span class="ticker-symbol">${item.symbol}</span>
            <span class="ticker-badge ${badgeClass}">${sign}${item.change}%</span>
          </div>
          <div class="ticker-price">${item.price}</div>
          <div class="ticker-name">${item.name}</div>
        </a>
      `;
    }).join('');
  }

  setupListeners() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', async () => {
        this.refreshBtn.style.transform = 'rotate(360deg)';
        this.refreshBtn.style.transition = 'transform 500ms ease';
        await this.fetchPrices();
        setTimeout(() => {
          this.refreshBtn.style.transform = 'none';
          this.refreshBtn.style.transition = 'none';
        }, 500);
      });
    }
  }
}

window.cryptoTicker = new CryptoTicker();
