# Hermes NewTab — Architecture & Engineering Plan

## 1. Vision & Core Philosophy

**Hermes NewTab** is an ultra-fast, local, privacy-first browser New Tab extension inspired by the **Nous Research / Hermes Agent** visual identity and modern developer workflows (Raycast, Linear).

### Key Pillars:
1. **Zero-Latency (<5ms Cold Load):** All primary assets, styles, fonts, and scripts are bundled locally. Zero external CDNs blocking the initial paint.
2. **Deep System & Browser Integration:**
   - Native Chrome APIs (`chrome.bookmarks`, `chrome.topSites`, `chrome.history`, `chrome.storage`)
   - Optional local System Bridge daemon (`http://127.0.0.1:20250`) providing real-time Arch Linux hardware telemetry (CPU, RAM, GPU, thermals) and status of local services (Oxiroute, Paperclip, Golestan, etc.).
3. **Hermes Visual Identity & UI/UX Standards:**
   - Dark Obsidian palette (`#07090e`) with translucent glass cards (`rgba(255, 255, 255, 0.03)`).
   - High-contrast typography: Classic elegant Serif headers (Instrument Serif / Playfair) paired with crisp developer Monospace (Geist Mono / JetBrains Mono).
   - Clean SVG iconography (Lucide SVGs embedded inline; zero emoji clutter in system UI).
   - Smooth, non-blocking 150ms interactions with full keyboard navigation.

---

## 2. Technical Architecture

### 2.1 Chrome Extension (Manifest V3)
```
hermes-newtab/
├── manifest.json              # Extension metadata & permissions
├── newtab.html                # Main New Tab DOM shell
├── css/
│   ├── hermes-theme.css       # Core design tokens, CSS variables, glassmorphism
│   ├── typography.css         # Serif & Mono font configurations
│   └── components.css         # Card, search, bookmark, and widget styles
├── js/
│   ├── app.js                 # Central orchestrator & state manager
│   ├── bookmarks.js           # Chrome Bookmarks API wrapper & renderer
│   ├── command-palette.js     # Raycast-style Ctrl+K search engine
│   ├── system-monitor.js      # Fetcher for local system bridge metrics
│   ├── scratchpad.js          # Persistent local notes with auto-save
│   └── icons.js               # Clean SVG icon definitions
├── assets/
│   ├── fonts/                 # Local WOFF2 font files
│   ├── hermes-hero-art.svg    # Etched engraving line-art accents
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── bridge/                    # Optional local hardware/service monitor
│   ├── server.py              # Lightweight Python HTTP daemon (<15MB RAM)
│   ├── system_metrics.py      # Linux psutil & nvidia-smi telemetry
│   └── requirements.txt
└── docs/
    └── PLAN.md                # This specification
```

### 2.2 Permissions in `manifest.json`
- `bookmarks`: Read and search native browser bookmarks in real-time.
- `topSites`: Most visited sites recommendation.
- `storage`: Save local dashboard preferences, widget visibility, custom links, and scratchpad notes.
- `favicon`: Access high-res cached domain icons via `chrome://favicon2/?size=64&scaleFactor=1x&showFallbackMonogram=&pageUrl=...`.
- `host_permissions`: `http://127.0.0.1:20250/*` and `http://localhost:20250/*` to poll the local system bridge.

---

## 3. UI/UX Design System (Hermes Aesthetic)

### 3.1 Color Palette
- **Background Root:** `#07090e` (Deep Obsidian Void)
- **Card Background:** `rgba(255, 255, 255, 0.025)`
- **Card Border:** `rgba(255, 255, 255, 0.07)`
- **Card Hover Border:** `rgba(59, 130, 246, 0.4)` (Electric Blue Glow)
- **Text Primary:** `#f8fafc` (Slate 50)
- **Text Muted:** `#94a3b8` (Slate 400)
- **Accent Electric Blue:** `#3b82f6` / `#2563eb`
- **Accent Gold/Amber (Hermes):** `#eab308` / `#f59e0b`
- **Status Online (Green):** `#10b981`
- **Status Offline (Red/Muted):** `#64748b`

### 3.2 Typography Hierarchy
- **Brand Title & Clocks:** `Instrument Serif`, `Playfair Display`, `Georgia`, serif (Italicized accents, letter-spacing: -0.02em).
- **Widgets, Labels & Body:** `Geist Mono`, `JetBrains Mono`, `Fira Code`, monospace.
- **Sizes:**
  - Hero Header / Time: `3.5rem - 4.5rem`
  - Widget Headers: `0.75rem` uppercase with `letter-spacing: 0.12em`
  - Body & Bookmarks: `0.85rem - 0.95rem`

---

## 4. Feature Specifications & Widgets

### 4.1 Header & System Telemetry Bar (Top Bar)
- Left: **HERMES** glyph badge + Host metadata (e.g. `ARCH LINUX // WAYLAND`).
- Center: Quick status pill indicator (Bridge connected / Offline mode).
- Right: Mini hardware telemetry pills:
  - **CPU:** Usage % & Temp
  - **RAM:** Used / Total GB
  - **GPU:** NVIDIA T600 usage & VRAM

### 4.2 Hero Section & Central Command Palette
- **Hero Title:** Dynamic greeting or Hermes motto (*"THE AGENT THAT GROWS WITH YOU"*).
- **Time & Date:** Elegant serif time with Gregorian + Persian date subtitle.
- **Raycast-Style Omni-Search Bar (`Ctrl+K` or `/`):**
  - Instant fuzzy search across native Chrome bookmarks.
  - Direct search engine queries (Google, DuckDuckGo, Perplexity, YouTube).
  - Prefix triggers:
    - `g/ <query>` -> Google Search
    - `gh/ <query>` -> GitHub Search / Repo navigation
    - `x/ <query>` -> X / Twitter
    - `p/ <query>` -> Perplexity AI
    - `b/ <query>` -> Filter only Bookmarks

### 4.3 Speed Dial & Bookmarks Matrix
- **Category Filter Tabs:** `All`, `Dev`, `AI`, `Academic`, `Personal`, `Tools`.
- **Bookmark Tiles:** High-resolution favicon, domain title, smooth hover elevation, quick-copy URL or open in new tab with middle-click.

### 4.4 Local Services & Infrastructure Watcher
- Real-time probe of local developer ports:
  - `Oxiroute` (`:20200`) — AI Gateway
  - `Paperclip` (`:3100`) — Agent Control Plane
  - `Golestan Automation` (`:8000`)
  - `OmniRoute` (`:20128`)
  - Custom user ports configurable via settings modal.

### 4.5 Quick Scratchpad / Sticky Notes
- Markdown-capable scratchpad stored in `chrome.storage.local`.
- Auto-saves on every keystroke.
- One-click copy or download as markdown file.

---

## 5. Local System Bridge (Optional Daemon)

A single-file Python daemon (`bridge/server.py`) using `http.server` or `FastAPI/uvicorn`:
- Runs in background or as a systemd user service (`hermes-bridge.service`).
- Reads `/proc/stat`, `/proc/meminfo`, and runs `nvidia-smi` queries.
- Exposes JSON on `GET http://127.0.0.1:20250/api/status`:
  ```json
  {
    "cpu": { "percent": 14.2, "cores": 16 },
    "ram": { "used_gb": 6.8, "total_gb": 32.0, "percent": 21.2 },
    "gpu": { "name": "NVIDIA T600", "util_percent": 8, "vram_used_mb": 512, "vram_total_mb": 4096, "temp_c": 42 },
    "services": {
      "oxiroute": { "port": 20200, "alive": true },
      "paperclip": { "port": 3100, "alive": true }
    }
  }
  ```
- If the bridge is not running, the New Tab gracefully degrades to browser-only mode without any errors or delays.

---

## 6. Implementation Milestones

1. **Phase 1: Extension Foundation & Hermes Theme** (Manifest, HTML shell, CSS tokens, glassmorphism, responsive grid).
2. **Phase 2: Bookmarks & Speed Dial** (`chrome.bookmarks` tree traversal, folder categorization, favicons).
3. **Phase 3: Command Palette (`Ctrl+K`)** (Keyboard navigation, fuzzy bookmark search, search shortcuts).
4. **Phase 4: Widgets & Scratchpad** (Serif clock, local storage markdown notes, settings modal).
5. **Phase 5: Local System Bridge** (Python daemon for Linux CPU/RAM/GPU telemetry & local service checking).
6. **Phase 6: Verification & Polishing** (Chrome unpacked load testing, performance audit, documentation).
