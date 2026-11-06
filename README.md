# Spoti-Fly 🎵🪽

> **Ultra-Lightweight, Always-on-Top Floating Spotify Mini-Player for Windows with Glassmorphic Physics and GSMTC Native Sync.**

<p align="center">
  <img src="public/cover.png" alt="Spoti-Fly Cover" width="560" style="border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

<p align="center">
  <a href="https://github.com/Satsugingg/spoti-fly/releases/latest">
    <img src="https://img.shields.io/badge/Download-Spoti--Fly_Setup.exe-1DB954?style=for-the-badge&logo=windows&logoColor=white" alt="Download Spoti-Fly for Windows" />
  </a>
  <a href="https://github.com/Satsugingg/spoti-fly/releases">
    <img src="https://img.shields.io/github/v/release/Satsugingg/spoti-fly?style=for-the-badge&color=202124&label=Release" alt="Release v1.5.2" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows_10_%26_11-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Platform: Windows 10 & 11" />
  <img src="https://img.shields.io/badge/Spotify-Vanilla_%7C_Store_%7C_Web-1DB954?style=for-the-badge&logo=spotify&logoColor=white" alt="Spotify: Vanilla | Store | Web" />
</p>

---

## 🎧 Works with All Forms of Spotify (No Mods Needed!)

Spoti-Fly works straight out of the box with **any** Spotify setup — zero configuration, zero patches, and zero developer accounts required:

* ✅ **Official Vanilla Spotify Desktop:** The standard Spotify installer downloaded from [spotify.com](https://spotify.com).
* ✅ **Microsoft Store Edition:** Spotify installed directly from the Windows Microsoft Store.
* ✅ **Web Player:** Spotify running inside Chrome, Edge, Brave, or Firefox.
* ✅ **Modded / Spicetify Clients:** Seamlessly compatible with any custom theme or modified setup.

> **How it works:** Spoti-Fly connects directly to Windows Global System Media Transport Controls (GSMTC). It reads live track metadata natively from the operating system, meaning it never touches or alters Spotify's files.

---

## 🚀 Quick Download & Install (For Everyone)

1. Download the latest installer from **[Releases](https://github.com/Satsugingg/spoti-fly/releases/latest)**:
   * **`Spoti-Fly Setup.exe`**
2. Run the installer — **zero wizard steps, zero prompts, zero bloat!** It installs seamlessly in 2 seconds like Discord or Spotify, creates your Desktop & Start Menu shortcuts, and launches Spoti-Fly immediately.
3. **Done!** Spoti-Fly hovers over your screen, syncs live with Spotify playback, and you can customize desktop shortcuts and auto-start anytime inside the in-app glassmorphic Settings modal.

---

## ✨ Features

* 🪟 **Always-on-Top:** Stays visible over full-screen apps, games, IDEs, and browser windows (even when unpinned).
* ⚡ **Ultra-Low Memory Footprint (~25–45 MB):** Subsystem pruning, disabled spare renderers, and native Win32 working set trimming reduce RAM usage by over 75% compared to standard desktop players.
* 🧲 **Magnetic Edge & Corner Snapping:** Tactile magnetic snap when dragging near monitor edges with physical inertia, spring dampening, and extra-strong magnetic latching with high-resistance breakaway when pulling out of screen corners.
* 🔍 **Proportional Player Scaling (50% – 200%):** Scale the entire mini-player from a discreet compact micro-widget (50%) to an ultra-large high-visibility display (200%) directly from Settings.
* 🔊 **Scroll Wheel Windows Master Volume Control & HUD:** Scroll mouse wheel anywhere over the mini-player to adjust Windows Master volume with a sleek temporary HUD overlay (can be toggled on or off in Settings).
* ⌨️ **System-Wide Global Hotkeys:** Control your music anywhere while gaming or working:
  * `Ctrl + Alt + Space` — Play / Pause
  * `Ctrl + Alt + →` — Next Track
  * `Ctrl + Alt + ←` — Previous Track
  * `Ctrl + Alt + ↑ / ↓` — Volume Up / Down (5%)
  * `Ctrl + Alt + H` — Show / Hide Spoti-Fly
* ⏭️ **Inline "Up Next" Queue Preview:** Compact album artwork thumbnail and title directly under the playback bar showing upcoming song details at a glance (configurable in Settings).
* 🎤 **Synced Lyrics Dropdown:** Expandable karaoke-style synchronized lyrics powered by LRCLIB with real-time auto-scroll and click-to-seek playback.
* 🎵 **Native Windows GSMTC Sync:** Strictly targets Spotify with zero interference from YouTube or browser audio.
* 🎨 **Dual Display Modes:**
  * **Standard Mode (142px):** Full album art, marquee title, artist, live glowing scrub bar, and controls.
  * **Ultra-Flat Minimal Mode (72px):** Streamlined single-line layout (`Whisper My Name - Drake`) with elapsed time only.
* 💨 **Smart Auto-Flattening:** Contracts smoothly after 2 seconds of mouse idle.
* 🎛️ **Full Playback Controls:** Play/pause, next track, previous track, shuffle, repeat, and click-to-seek progress bar.

---

## 🛠️ Developer Setup & Building from Source

If you want to contribute or build Spoti-Fly from source:

### Prerequisites
* Windows 10 / 11
* [Node.js](https://nodejs.org) (v18+)
* Spotify (any version)

### Building

```bash
# Clone the repository
git clone https://github.com/satsugingg/spoti-fly.git
cd spoti-fly

# Install dependencies
npm install

# Run in development mode
npm run dev

# Package standalone Windows custom Installer (.exe)
npm run package
```

The compiled installer will be generated in `release/Spoti-Fly Setup 1.5.2.exe`.

---

## 📄 License

MIT License © 2026 satsugingg
