# Spotifly 🎵🪽

> **Ultra-Lightweight, Always-on-Top Floating Spotify Mini-Player for Windows with Glassmorphic Physics, GSMTC Native Sync, and Spicetify Integration.**

<p align="center">
  <img src="public/cover.png" alt="Spotifly Cover" width="560" style="border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

<p align="center">
  <a href="https://github.com/Satsugingg/spoti-fly/releases/latest">
    <img src="https://img.shields.io/badge/Download-Spotifly%20Setup%20(.exe)-1DB954?style=for-the-badge&logo=windows&logoColor=black" alt="Download Spotifly for Windows" />
  </a>
  <a href="https://github.com/Satsugingg/spoti-fly/releases">
    <img src="https://img.shields.io/github/v/release/Satsugingg/spoti-fly?style=for-the-badge&color=202124&label=Latest%20Release" alt="Latest Release" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue?style=for-the-badge" alt="Platform: Windows" />
</p>

---

## 🚀 Quick Download & Install (For Everyone)

1. Download the latest installer from **[Releases](https://github.com/Satsugingg/spoti-fly/releases/latest)**:
   * **`Spotifly Setup.exe`**
2. Run the installer and choose your shortcut preferences (Desktop & Start Menu).
3. **Done!** Spotifly opens on your screen, hovers over all your apps and games, and automatically syncs live with Spotify playback. It starts quietly with Windows on every boot so it's always ready.

---

## ✨ Features

* 🪟 **Always-on-Top:** Stays visible over full-screen apps, games, IDEs, and browser windows.
* 🧲 **Fluid Drag Physics:** Exponential lerp motion with zero rubber-banding or stutter.
* 🎵 **Native Windows GSMTC Sync:** Directly hooks into Windows Media Transport Controls — strictly targets Spotify with zero interference from YouTube or browser tabs.
* 🎨 **Dual Display Modes:**
  * **Standard Mode (130px):** Full album art, marquee title, artist, live glowing scrub bar, and controls.
  * **Ultra-Flat Minimal Mode (72px):** Streamlined single-line layout (`Whisper My Name - Drake`) with elapsed time only.
* 💨 **Smart Auto-Flattening:** Contracts smoothly after 2 seconds of mouse idle.
* 🎛️ **Full Playback Controls:** Play/pause, next track, previous track, shuffle, repeat, and click-to-seek progress bar.
* 🪽 **Optional Spicetify Companion:** If you use [Spicetify](https://spicetify.app), you can install the **spoti-fly** extension directly from Spicetify Marketplace to add a winged launcher button to Spotify's top bar!

---

## 🛠️ Developer Setup & Building from Source

If you want to contribute or build Spotifly from source:

### Prerequisites
* Windows 10 / 11
* [Node.js](https://nodejs.org) (v18+)
* Spotify Desktop Client

### Building

```bash
# Clone the repository
git clone https://github.com/Satsugingg/spoti-fly.git
cd spoti-fly

# Install dependencies
npm install

# Run in development mode
npm run dev

# Package standalone Windows NSIS Installer (.exe)
npm run package
```

The compiled installer will be generated in `release/Spotifly Setup 1.0.0.exe`.

---

## 📄 License

MIT License © 2026 satsugingg
