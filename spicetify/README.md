# Spotifly for Spicetify

> **One-click topbar launcher extension to open and focus your floating Spotifly desktop mini-player directly from Spotify.**

**Spotifly** for Spicetify seamlessly integrates the floating desktop mini-player with the official Spotify client using [Spicetify](https://spicetify.app).

![Spotifly Preview](assets/preview.png)

---

## ✨ Features

* **Topbar Quick-Launcher Button:** Adds a dedicated winged green launcher button directly into Spotify's top bar.
* **Instant Focus / Summon:** Clicking the button instantly wakes, launches, or brings your floating Spotifly desktop mini-player to the front via local IPC (`http://127.0.0.1:45454/show` and `spoti-fly://open/`).
* **Clean & Lightweight:** Zero clutter — no extra sidebar menus or heavy background webviews; just a lightweight, zero-latency trigger button.

---

## 🚀 Local Installation

### Automatic One-Click Installer (Recommended)

Open PowerShell inside `spicetify/` and run:

```powershell
powershell -ExecutionPolicy Bypass -File ./install-to-spicetify.ps1
```

### Manual CLI Steps

1. **Copy the extension script:**
   ```powershell
   Copy-Item ./extension.js -Destination "$env:APPDATA\spicetify\Extensions\spoti-fly.js" -Force
   ```

2. **Register & Apply in Spicetify:**
   ```powershell
   spicetify config extensions spoti-fly.js
   spicetify apply
   ```

---

## 🌐 Spicetify Marketplace

This repository is configured for Spicetify Marketplace discovery:
* **Topic Tag:** `spicetify-extensions`
* **Type:** Extension
* **Category:** Utility / Mini-player Launcher

---

## 📁 Files

```text
spicetify/
├── manifest.json             # Spicetify Extension Marketplace metadata
├── extension.js              # Topbar launcher button script
├── install-to-spicetify.ps1  # Automated local installation script
├── package.json              # Package metadata and helper scripts
├── README.md                 # Documentation
└── assets/
    └── preview.png           # Marketplace preview artwork
```
