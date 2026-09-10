// Live Crypto & Real-Time Dollar Market Ticker Engine (No Defaults, 100% Live API Data)

class CryptoTicker {
  constructor() {
    this.cacheKey = 'hermes_market_data_live_v1';
    this.cacheTtl = 60 * 1000; // 1 minute fresh cache
    
    this.gridEl = document.getElementById('crypto-grid');
    this.refreshBtn = document.getElementById('btn-refresh-crypto');
    this.pollInterval = 60 * 1000; // 60s
    this.timer = null;

    this.icons = {
      USD: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#10b981"/><text x="12" y="16.5" font-family="monospace" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">$</text></svg>`,
      BTC: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#f7931a"/><path d="M15.5 10.2c.2-1.3-.8-2-2.2-2.5l.4-1.8-1.1-.3-.4 1.7c-.3-.1-.6-.1-.9-.2l.4-1.7-1.1-.3-.4 1.8c-.3-.1-.5-.1-.7-.2l-1.5-.4-.3 1.2s.8.2.8.2c.4.1.6.4.5.7l-1.3 5.3c-.1.2-.3.3-.6.2 0 0-.8-.2-.8-.2l-.6 1.3 1.4.4c.3.1.5.2.8.2l-.4 1.8 1.1.3.4-1.7c.3.1.6.2.9.2l-.4 1.7 1.1.3.4-1.8c1.9.4 3.3.2 3.9-1.5.5-1.4 0-2.2-1-2.7.7-.4 1.2-1.1 1-2.3zm-1.8 4.2c-.3 1.4-2.5.7-3.2.5l.6-2.3c.7.2 2.9.5 2.6 1.8zm.3-4.3c-.3 1.3-2.1.6-2.7.5l.5-2.1c.6.2 2.5.5 2.2 1.6z" fill="#fff"/></svg>`,
      ETH: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#627eea"/><path d="M12 4l-5 8.3 5 3 5-3L12 4z" fill="#c0cbff"/><path d="M12 4v11.3l5-3L12 4z" fill="#fff"/><path d="M12 16.2l-5-2.9 5 6.7 5-6.7-5 2.9z" fill="#c0cbff"/><path d="M12 16.2V20l5-6.7-5 2.9z" fill="#fff"/></svg>`,
      SOL: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="11" fill="#14151a"/><path d="M6.5 15.8h8.8l2.2-2.2H8.7l-2.2 2.2zm0-5.4h8.8l2.2-2.2H8.7l-2.2 2.2zm2.2-5.4h8.8l-2.2 2.2H6.5l2.2-2.2z" fill="url(#solGrad)"/><defs><linearGradient id="solGrad" x1="6.5" y1="5" x2="17.5" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient></defs></svg>`
    };
  }

  async init() {
    this.gridEl = document.getElementById('crypto-grid');
    this.refreshBtn = document.getElementById('btn-refresh-crypto');
    if (!this.gridEl) return;

    this.setupListeners();

    // 1. Instant paint from real cache if available
    const cached = this.getCached();
    if (cached && Array.isArray(cached.data)) {
      this.render(cached.data);
    } else {
      this.renderLoading();
    }

    // 2. Fetch fresh real data
    await this.fetchPrices();

    // 3. Periodic Background Refresh
    if (this.timer) clearInterval(this.timer);
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

  renderLoading() {
    if (!this.gridEl) return;
    const items = [
      { symbol: 'USD', name: 'Dollar (دلار)', price: 'Loading...', subPrice: 'fetching live...', change: null, url: 'https://www.tgju.org/profile/price_dollar_rl' },
      { symbol: 'BTC', name: 'Bitcoin', price: 'Loading...', subPrice: 'fetching live...', change: null, url: 'https://www.tradingview.com/symbols/BTCUSD/' },
      { symbol: 'ETH', name: 'Ethereum', price: 'Loading...', subPrice: 'fetching live...', change: null, url: 'https://www.tradingview.com/symbols/ETHUSD/' },
      { symbol: 'SOL', name: 'Solana', price: 'Loading...', subPrice: 'fetching live...', change: null, url: 'https://www.tradingview.com/symbols/SOLUSD/' }
    ];
    this.render(items, true);
  }

  renderError(msg = 'Failed to fetch live prices') {
    if (!this.gridEl) return;
    const items = [
      { symbol: 'USD', name: 'Dollar (دلار)', price: '-- T', subPrice: 'Offline / Error', change: null, url: 'https://www.tgju.org/profile/price_dollar_rl' },
      { symbol: 'BTC', name: 'Bitcoin', price: '$--', subPrice: 'Offline / Error', change: null, url: 'https://www.tradingview.com/symbols/BTCUSD/' },
      { symbol: 'ETH', name: 'Ethereum', price: '$--', subPrice: 'Offline / Error', change: null, url: 'https://www.tradingview.com/symbols/ETHUSD/' },
      { symbol: 'SOL', name: 'Solana', price: '$--', subPrice: 'Offline / Error', change: null, url: 'https://www.tradingview.com/symbols/SOLUSD/' }
    ];
    this.render(items, false, true);
  }

  formatTomanShort(num) {
    if (!num || isNaN(num) || num <= 0) return '';
    if (num >= 1_000_000_000) {
      return `≈ ${(num / 1_000_000_000).toFixed(2)}B T`;
    }
    if (num >= 1_000_000) {
      return `≈ ${(num / 1_000_000).toFixed(1)}M T`;
    }
    return `≈ ${Math.round(num).toLocaleString('en-US')} T`;
  }

  async fetchDollarRate() {
    // Primary: Tetherland Live Free-Market Currency API
    try {
      const res = await fetch('https://api.tetherland.com/currencies', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const usdt = json.data?.currencies?.USDT;
        if (usdt && usdt.price) {
          return {
            rate: Math.round(Number(usdt.price)),
            change: parseFloat(usdt.diff24d) || 0
          };
        }
      }
    } catch (e) {
      console.warn('Tetherland fetch failed:', e);
    }

    // Secondary Fallback: Bitpin Live Markets API
    try {
      const res = await fetch('https://api.bitpin.ir/v1/mkt/markets/', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const usdt = json.results?.find(r => r.code === 'USDT_IRT');
        if (usdt && usdt.price) {
          return {
            rate: Math.round(parseFloat(usdt.price)),
            change: parseFloat(usdt.otc_percent_change) || 0
          };
        }
      }
    } catch (e) {
      console.warn('Bitpin fetch failed:', e);
    }

    return null;
  }

  async fetchCryptoPrices() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('CoinGecko fetch failed:', e);
    }
    return null;
  }

  async fetchPrices() {
    try {
      const [dollarData, cryptoData] = await Promise.all([
        this.fetchDollarRate(),
        this.fetchCryptoPrices()
      ]);

      if (!dollarData && !cryptoData) {
        const cached = this.getCached();
        if (!cached) {
          this.renderError();
        }
        return;
      }

      const dollarRate = dollarData ? dollarData.rate : null;
      const dollarChange = dollarData ? Number(dollarData.change.toFixed(2)) : null;

      const btcUsd = cryptoData?.bitcoin?.usd || null;
      const btcChange = cryptoData?.bitcoin?.usd_24h_change != null ? Number(cryptoData.bitcoin.usd_24h_change.toFixed(2)) : null;

      const ethUsd = cryptoData?.ethereum?.usd || null;
      const ethChange = cryptoData?.ethereum?.usd_24h_change != null ? Number(cryptoData.ethereum.usd_24h_change.toFixed(2)) : null;

      const solUsd = cryptoData?.solana?.usd || null;
      const solChange = cryptoData?.solana?.usd_24h_change != null ? Number(cryptoData.solana.usd_24h_change.toFixed(2)) : null;

      const assets = [
        {
          symbol: 'USD',
          name: 'Dollar (دلار)',
          price: dollarRate ? `${dollarRate.toLocaleString('en-US')} T` : '-- T',
          subPrice: 'US Dollar',
          change: dollarChange,
          url: 'https://www.tgju.org/profile/price_dollar_rl'
        },
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: btcUsd ? `$${btcUsd.toLocaleString('en-US')}` : '$--',
          subPrice: (btcUsd && dollarRate) ? this.formatTomanShort(btcUsd * dollarRate) : '',
          change: btcChange,
          url: 'https://www.tradingview.com/symbols/BTCUSD/'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: ethUsd ? `$${ethUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          subPrice: (ethUsd && dollarRate) ? this.formatTomanShort(ethUsd * dollarRate) : '',
          change: ethChange,
          url: 'https://www.tradingview.com/symbols/ETHUSD/'
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: solUsd ? `$${solUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--',
          subPrice: (solUsd && dollarRate) ? this.formatTomanShort(solUsd * dollarRate) : '',
          change: solChange,
          url: 'https://www.tradingview.com/symbols/SOLUSD/'
        }
      ];

      this.saveCache(assets);
      this.render(assets);
    } catch (e) {
      console.warn('Market ticker update error:', e);
      if (!this.getCached()) {
        this.renderError();
      }
    }
  }

  render(items, isLoading = false, isError = false) {
    if (!this.gridEl || !Array.isArray(items)) return;

    this.gridEl.innerHTML = items.map(item => {
      let badgeHtml = '';
      if (item.change != null && !isLoading && !isError) {
        const isPos = item.change >= 0;
        const sign = isPos ? '+' : '';
        const badgeClass = isPos ? 'positive' : 'negative';
        badgeHtml = `<span class="ticker-badge ${badgeClass} font-mono">${sign}${item.change}%</span>`;
      } else if (isLoading) {
        badgeHtml = `<span class="ticker-badge font-mono" style="opacity:0.4;">...</span>`;
      } else if (isError) {
        badgeHtml = `<span class="ticker-badge negative font-mono">ERR</span>`;
      }

      const iconSvg = this.icons[item.symbol] || '';

      return `
        <a href="${item.url}" target="_blank" class="ticker-item ${isLoading ? 'is-loading' : ''}" title="View ${item.name} live rate on TGJU / TradingView">
          <div class="ticker-top">
            <div class="ticker-symbol-group">
              <span class="ticker-icon">${iconSvg}</span>
              <span class="ticker-symbol font-mono">${item.symbol}</span>
            </div>
            ${badgeHtml}
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
