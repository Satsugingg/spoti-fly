# spoti-fly for Spicetify

> **Glassmorphic Mini-Player Hub & Floating Desktop Pop-out directly inside Spotify.**

**spoti-fly** for Spicetify brings the fluid, glassmorphic mini-player experience into the official Spotify desktop client via [Spicetify](https://spicetify.app).

![spoti-fly Preview](assets/preview.png)

---

## ✨ Features

* **Topbar & Sidebar Integration:** Adds a dedicated winged spoti-fly button in Spotify's top bar to launch/focus the desktop app, plus a custom app hub in Spotify's sidebar.
* **Dual Display Modes:**
  * **Standard Mode (130px):** Full album artwork, marquee title, artist, live glowing scrub bar, and media controls (Play/Pause, Skip, Previous, Shuffle, Repeat).
  * **Ultra-Flat Minimal Mode (72px):** Streamlined single-line layout (`Whisper My Name - Drake`) with elapsed time only.
* **Native Zero-Latency Controls:** Directly wired into `Spicetify.Player` with zero API rate limits and instant playback responsiveness.
* **Floating Desktop Pop-out (Picture-in-Picture):** One-click button to pop out an always-on-top floating mini-player window that hovers over your games, IDEs, and browser windows.
* **Seamless Desktop Launcher:** Directly triggers or focuses the Windows desktop `spoti-fly` mini-player with a single click.

---

## 🚀 Installation (Upload to Local Spicetify)

### Option A: Automatic One-Click Installer (Recommended)

Open PowerShell inside this directory (`d:\Antigravity Projects\Spotifly-Spicetify`) and run:

```powershell
powershell -ExecutionPolicy Bypass -File ./install-to-spicetify.ps1
```

### Option B: Manual CLI Steps

1. **Copy the folder to Spicetify's CustomApps directory:**
   ```powershell
   New-Item -ItemType Directory -Path "$env:APPDATA\spicetify\CustomApps\spoti-fly" -Force
   Copy-Item * "$env:APPDATA\spicetify\CustomApps\spoti-fly" -Recurse -Force
   ```

2. **Register the Custom App & Extension in Spicetify:**
   ```powershell
   spicetify config custom_apps spoti-fly
   spicetify config extensions spoti-fly.js
   ```

3. **Apply Spicetify changes:**
   ```powershell
   spicetify apply
   ```

---

## 🌐 Publishing to GitHub & Spicetify Marketplace

Spicetify Marketplace dynamically indexes public GitHub repositories using repository topic tags. You do **not** need to submit a form — the Marketplace bot crawls GitHub automatically!

### Step 1: Create a Public GitHub Repository
1. Go to [github.com/new](https://github.com/new) and create a new **public** repository named `spoti-fly`.

### Step 2: Push this Folder to GitHub
Initialize git and push the contents of `Spotifly-Spicetify`:
```bash
git init
git add .
git commit -m "Initial commit: spoti-fly Spicetify Custom App"
git branch -M main
git remote add origin https://github.com/<your-username>/spoti-fly.git
git push -u origin main
```

### Step 3: Add the GitHub Topic Tag
1. On your repository page on GitHub, click the **⚙️ (Settings gear)** next to the **About** section on the right sidebar.
2. In the **Topics** field, add the exact tag:
   ```
   spicetify-apps
   ```
3. Save changes.

### Step 4: Marketplace Indexing
Once tagged with `spicetify-apps`, the Spicetify Marketplace indexing crawler will discover your repository within 24–48 hours, read `manifest.json`, and display **spoti-fly** directly under the **Marketplace → Apps** tab inside Spotify for all Spicetify users worldwide!

---

## 📁 Project Structure

```text
Spotifly-Spicetify/
├── manifest.json             # Spicetify Custom App & Marketplace metadata
├── index.js                  # Standalone React application mounted by Spicetify
├── extension.js              # Topbar quick launcher extension
├── style.css                 # Glassmorphic styles, animations, and layouts
├── install-to-spicetify.ps1  # Automated local installation script
├── package.json              # Package metadata and helper scripts
├── README.md                 # Documentation & publishing guide
└── assets/
    ├── logo.png              # High-resolution winged spoti-fly logo
    └── preview.png           # Marketplace showcase preview image
```
