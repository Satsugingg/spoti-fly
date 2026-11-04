# ==============================================================================
# spoti-fly - Local Spicetify Extension Installer
# Installs the topbar launcher button into Spotify and applies changes.
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  spoti-fly -> Spicetify Extension Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green

# 1. Determine Spicetify CLI and Extensions paths
$spicetifyCli = Get-Command spicetify -ErrorAction SilentlyContinue
if (-not $spicetifyCli) {
    Write-Error "Spicetify CLI ('spicetify') was not found in your PATH. Please install Spicetify first."
}

$extensionsDir = "$env:APPDATA\spicetify\Extensions"
if (-not (Test-Path $extensionsDir)) {
    $extensionsDir = "$env:LOCALAPPDATA\spicetify\Extensions"
}

if (-not (Test-Path $extensionsDir)) {
    New-Item -ItemType Directory -Path $extensionsDir -Force | Out-Null
}

$sourceDir = $PSScriptRoot
$sourceExtension = Join-Path $sourceDir "extension.js"
$targetExtension = Join-Path $extensionsDir "spoti-fly.js"

# 2. Clean up any legacy CustomApp files/config if present
$customAppsDir = "$env:APPDATA\spicetify\CustomApps\spoti-fly"
if (Test-Path $customAppsDir) {
    Write-Host "[1/4] Removing legacy CustomApp folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $customAppsDir -ErrorAction SilentlyContinue
}

$currentCustomApps = & spicetify config custom_apps
if ($currentCustomApps -match "spoti-fly") {
    Write-Host "[2/4] Removing 'spoti-fly' from custom_apps..." -ForegroundColor Gray
    & spicetify config custom_apps spoti-fly-
}

# 3. Copy extension.js to Spicetify Extensions
Write-Host "[3/4] Copying extension to $targetExtension..." -ForegroundColor Yellow
Copy-Item $sourceExtension -Destination $targetExtension -Force

# 4. Enable in Spicetify config and apply
Write-Host "[4/4] Configuring and applying Spicetify changes..." -ForegroundColor Yellow
$currentExtensions = & spicetify config extensions
if ($currentExtensions -notmatch "spoti-fly.js") {
    & spicetify config extensions spoti-fly.js
}

& spicetify apply

Write-Host ""
Write-Host "SUCCESS: Spotifly extension installed!" -ForegroundColor Green
Write-Host "Look for the green Spotifly launcher button in Spotify's top bar." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
