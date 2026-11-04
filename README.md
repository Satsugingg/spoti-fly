# spoti-fly 🎵🪽

> **Ultra-Lightweight, Always-on-Top Floating Spotify Mini-Player for Windows with Glassmorphic Physics, GSMTC Native Sync, and Spicetify Integration.**

![spoti-fly Banner](public/logo.png)

---

## ✨ Highlights

* 🪟 **Always-on-Top & Pinned State:** Pin window down in place or unpin to drag anywhere across your monitors.
* 🧲 **Fluid Drag Physics:** Powered by an exponential lerp drag engine with zero bounce.
* 💨 **Smart Auto-Flattening:** Automatically contracts down after 2 seconds of mouse idle.
* 🎵 **GSMTC Native Spotify Sync:** Reads Windows Global System Media Transport Controls directly via PowerShell daemon — targeting Spotify specifically with zero YouTube/browser media interference.
* ➖ **Minimize & Window Controls:** Minimize directly to taskbar without terminating background sync, or exit anytime.
* 🎨 **Configurable Opacity & Minimal Mode:** Full opacity slider (40%–100%) and ultra-flat minimal 72px mode.
* 🚀 **Spicetify One-Click Integration:** Launch or focus `spoti-fly` directly from within the Spotify desktop app.

---

## 🚀 Getting Started

### Prerequisites

* Windows 10 / 11
* [Node.js](https://nodejs.org) (v18+)
* Spotify Desktop Client & [Spicetify](https://spicetify.app)

---

### Step 1: Install & Build the Desktop Mini-Player

```bash
# Clone the repository
git clone https://github.com/satsugingg/spoti-fly.git
cd spoti-fly

# Install dependencies & build
npm install
npm run build

# Register the Windows launcher protocol (run once in PowerShell)
powershell -ExecutionPolicy Bypass -File ./register-protocol.ps1
```

You can now start `spoti-fly` anytime by:
* **Double-clicking** `launch.vbs` (silent background launch), or
* Running `npm start` in your terminal.

---

### Step 2: Install the Spicetify Spotify Button

To add the one-click winged button to your Spotify topbar:

```powershell
# From the root of the cloned spoti-fly directory:
cd spicetify
powershell -ExecutionPolicy Bypass -File ./install-to-spicetify.ps1
```

Once installed, restart Spotify and click the green winged icon in the topbar to instantly summon `spoti-fly`!

---

## 🛠️ Scripts & Build Commands

* `npm run dev` — Run Vite dev server + TypeScript watcher concurrently
* `npm run build` — Clean build of both Electron main process and React renderer
* `npm run typecheck` — TypeScript type validation
* `npm start` — Launch production Electron build

---

## 📄 License

MIT License © 2026 Gustas
