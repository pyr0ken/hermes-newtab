# ⚡ Hermes NewTab

> **An ultra-fast, local-first personal dashboard & New Tab extension for Chromium browsers, inspired by the Hermes / Nous Research visual identity.**

---

## ✨ Features

- 🌌 **Hermes Dark Aesthetic:** Deep obsidian tones (`#07090e`), frosted glass cards (`backdrop-blur`), electric blue accents, and classical Serif typography.
- ⚡ **Zero Latency (<5ms):** Fully local assets and fonts. No blocking network requests on startup.
- 🗂 **Native Chrome Bookmarks:** Instant real-time extraction and organization of your browser bookmarks with high-res favicons.
- ⌘ **Raycast-Style Command Palette (`Ctrl+K`):** Fuzzy-search bookmarks, jump to tabs, or trigger search engines with prefix shortcuts (`g/`, `gh/`, `x/`, `p/`).
- 📈 **Linux Hardware Telemetry:** Real-time CPU, RAM, and NVIDIA GPU metrics via an ultra-light local bridge daemon.
- 🔌 **Local Service Health Watcher:** Live status indicator for your local developer services (Oxiroute, Paperclip, Golestan, etc.).
- 📝 **Persistent Markdown Scratchpad:** Instant notes saved safely in local storage.

---

## 🚀 Quick Start (Installation)

### 1. Load Extension in Chrome / Chromium / Brave:
1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `/home/omid/Code/fun/hermes-newtab` directory.
4. Press `Ctrl + T` to open a new tab!

### 2. Optional: Run Local System Bridge (for Linux hardware metrics):
```bash
cd /home/omid/Code/fun/hermes-newtab/bridge
python3 server.py
```

---

## 🎨 Design Tokens & Hierarchy

- **Title & Serif Headers:** Instrument Serif / Georgia / Playfair
- **Code & Metric Data:** Geist Mono / JetBrains Mono / Monospace
- **Base Background:** `#07090e` (Deep Obsidian)
- **Accent:** `#3b82f6` (Hermes Electric Blue)

---

## 📄 License
MIT © [Nous Research Inspired]
