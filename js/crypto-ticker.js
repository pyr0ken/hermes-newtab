// Live Crypto & Currency Market Ticker Engine (BTC, ETH, SOL, USD in Toman)

class CryptoTicker {
  constructor() {
    this.cacheKey = 'hermes_market_data_v4';
    this.cacheTtl = 2 * 60 * 1000; // 2 minutes
    this.cryptoApiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true';
    
    // Default USD to Toman baseline rate
    this.usdRateToman = parseInt(localStorage.getItem('hermes_usd_toman_rate'), 10) || 93500;

    this.gridEl = document.getElementById('crypto-grid');
    this.refreshBtn = document.getElementById('btn-refresh-crypto');
    this.pollInterval = 60 * 1000; // 60s
    this.timer = null;

    this.icons = {
      BTC: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#f7931a"/><path d="M15.5 10.2c.2-1.3-.8-2-2.2-2.5l.4-1.8-1.1-.3-.4 1.7c-.3-.1-.6-.1-.9-.2l.4-1.7-1.1-.3-.4 1.8c-.3-.1-.5-.1-.7-.2l-1.5-.4-.3 1.2s.8.2.8.2c.4.1.6.4.5.7l-1.3 5.3c-.1.2-.3.3-.6.2 0 0-.8-.2-.8-.2l-.6 1.3 1.4.4c.3.1.5.2.8.2l-.4 1.8 1.1.3.4-1.7c.3.1.6.2.9.2l-.4 1.7 1.1.3.4-1.8c1.9.4 3.3.2 3.9-1.5.5-1.4 0-2.2-1-2.7.7-.4 1.2-1.1 1-2.3zm-1.8 4.2c-.3 1.4-2.5.7-3.2.5l.6-2.3c.7.2 2.9.5 2.6 1.8zm.3-4.3c-.3 1.3-2.1.6-2.7.5l.5-2.1c.6.2 2.5.5 2.2 1.6z" fill="#fff"/></svg>`,
      ETH: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#627eea"/><path d="M12 4l-5 8.3 5 3 5-3L12 4z" fill="#c0cbff"/><path d="M12 4v11.3l5-3L12 4z" fill="#fff"/><path d="M12 16.2l-5-2.9 5 6.7 5-6.7-5 2.9z" fill="#c0cbff"/><path d="M12 16.2V20l5-6.7-5 2.9z" fill="#fff"/></svg>`,
      SOL: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#14151a"/><path d="M6.5 15.8h8.8l2.2-2.2H8.7l-2.2 2.2zm0-5.4h8.8l2.2-2.2H8.7l-2.2 2.2zm2.2-5.4h8.8l-2.2 2.2H6.5l2.2-2.2z" fill="url(#solGrad)"/><defs><linearGradient id="solGrad" x1="6.5" y1="5" x2="17.5" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient></defs></svg>`,
      USD: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#10b981"/><text x="12" y="16.5" font-family="monospace" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">$</text></svg>`
    };
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
      { symbol: 'USD', name: 'Dollar (دلار)', price: `${this.usdRateToman.toLocaleString('fa-IR')} تومان`, subPrice: `${this.usdRateToman.toLocaleString('en-US')} T`, change: 0.35, url: 'https://www.tgju.org/profile/price_dollar_rl' },
      { symbol: 'BTC', name: 'Bitcoin', price: '$--', subPrice: '', change: 0, url: 'https://www.tradingview.com/symbols/BTCUSD/' },
      { symbol: 'ETH', name: 'Ethereum', price: '$--', subPrice: '', change: 0, url: 'https://www.tradingview.com/symbols/ETHUSD/' },
      { symbol: 'SOL', name: 'Solana', price: '$--', subPrice: '', change: 0, url: 'https://www.tradingview.com/symbols/SOLUSD/' }
    ];
    this.renderItems(defaults);
  }

  formatTomanShort(num) {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(2)}B T`;
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M T`;
    }
    return `${Math.round(num).toLocaleString('en-US')} T`;
  }

  async fetchPrices() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(this.cryptoApiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return;
      const json = await res.json();
      if (!json || typeof json !== 'object') return;

      const usdPriceToman = this.usdRateToman;

      const btcUsd = json.bitcoin ? json.bitcoin.usd : 0;
      const ethUsd = json.ethereum ? json.ethereum.usd : 0;
      const solUsd = json.solana ? json.solana.usd : 0;

      const assets = [
        {
          symbol: 'USD',
          name: 'Dollar (دلار)',
          price: `${usdPriceToman.toLocaleString('fa-IR')} تومان`,
          subPrice: `${usdPriceToman.toLocaleString('en-US')} Toman`,
          change: 0.42,
          url: 'https://www.tgju.org/profile/price_dollar_rl'
        },
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: btcUsd ? `$${btcUsd.toLocaleString('en-US')}` : '$--',
          subPrice: btcUsd ? `≈ ${this.formatTomanShort(btcUsd * usdPriceToman)}` : '',
          change: json.bitcoin ? Number(json.bitcoin.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/BTCUSD/'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: ethUsd ? `$${ethUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          subPrice: ethUsd ? `≈ ${this.formatTomanShort(ethUsd * usdPriceToman)}` : '',
          change: json.ethereum ? Number(json.ethereum.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/ETHUSD/'
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: solUsd ? `$${solUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          subPrice: solUsd ? `≈ ${this.formatTomanShort(solUsd * usdPriceToman)}` : '',
          change: json.solana ? Number(json.solana.usd_24h_change.toFixed(2)) : 0,
          url: 'https://www.tradingview.com/symbols/SOLUSD/'
        }
      ];

      this.saveCache(assets);
      this.render({ data: assets });
    } catch (e) {
      console.warn('Market ticker fetch skipped:', e);
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
      const iconSvg = this.icons[item.symbol] || '';

      return `
        <a href="${item.url}" target="_blank" class="ticker-item" title="View ${item.name} rate">
          <div class="ticker-top">
            <div class="ticker-symbol-group">
              <span class="ticker-icon">${iconSvg}</span>
              <span class="ticker-symbol font-mono">${item.symbol}</span>
            </div>
            <span class="ticker-badge ${badgeClass} font-mono">${sign}${item.change}%</span>
          </div>
          <div class="ticker-price font-mono">${item.price}</div>
          <div class="ticker-bottom">
            <span class="ticker-name">${item.name}</span>
            ${item.subPrice ? `<span class="ticker-subprice font-mono">${item.subPrice}</span>` : ''}
          </div>
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
