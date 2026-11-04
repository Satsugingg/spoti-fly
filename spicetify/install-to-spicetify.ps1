# ==============================================================================
# spoti-fly - Local Spicetify Installer Script
# Copies spoti-fly to Spicetify's CustomApps directory, configures, and applies it.
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  spoti-fly -> Spicetify Installer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green

# 1. Determine Spicetify AppData and CLI paths
$spicetifyCli = Get-Command spicetify -ErrorAction SilentlyContinue
if (-not $spicetifyCli) {
    Write-Error "Spicetify CLI ('spicetify') was not found in your PATH. Please install Spicetify first."
}

$customAppsDir = "$env:APPDATA\spicetify\CustomApps"
if (-not (Test-Path $customAppsDir)) {
    $customAppsDir = "$env:LOCALAPPDATA\spicetify\CustomApps"
}

$extensionsDir = "$env:APPDATA\spicetify\Extensions"
if (-not (Test-Path $extensionsDir)) {
    $extensionsDir = "$env:LOCALAPPDATA\spicetify\Extensions"
}

$targetDir = Join-Path $customAppsDir "spoti-fly"
$sourceDir = $PSScriptRoot

Write-Host "[1/5] Target directories:" -ForegroundColor Yellow
Write-Host "  CustomApp: $targetDir" -ForegroundColor Gray
Write-Host "  Extension: $extensionsDir" -ForegroundColor Gray

# 2. Create destination folder and copy files
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Write-Host "[2/5] Copying spoti-fly Custom App files..." -ForegroundColor Yellow
Copy-Item (Join-Path $sourceDir "index.js") -Destination $targetDir -Force
Copy-Item (Join-Path $sourceDir "manifest.json") -Destination $targetDir -Force
Copy-Item (Join-Path $sourceDir "style.css") -Destination $targetDir -Force
Copy-Item (Join-Path $sourceDir "extension.js") -Destination $targetDir -Force

$assetsDir = Join-Path $sourceDir "assets"
if (Test-Path $assetsDir) {
    $targetAssets = Join-Path $targetDir "assets"
    if (-not (Test-Path $targetAssets)) {
        New-Item -ItemType Directory -Path $targetAssets -Force | Out-Null
    }
    Copy-Item (Join-Path $assetsDir "*") -Destination $targetAssets -Force
}

# Copy extension.js to Spicetify Extensions for the topbar/playbar button
Write-Host "[3/5] Installing Spicetify Topbar Button extension..." -ForegroundColor Yellow
Copy-Item (Join-Path $sourceDir "extension.js") -Destination (Join-Path $extensionsDir "spoti-fly.js") -Force

# 3. Add to Spicetify config if not already added
Write-Host "[4/5] Enabling 'spoti-fly' in Spicetify config..." -ForegroundColor Yellow
$currentCustomApps = & spicetify config custom_apps
if ($currentCustomApps -notmatch "spoti-fly") {
    & spicetify config custom_apps spoti-fly
}

$currentExtensions = & spicetify config extensions
if ($currentExtensions -notmatch "spoti-fly.js") {
    & spicetify config extensions spoti-fly.js
}

# 4. Apply Spicetify modifications to Spotify
Write-Host "[5/5] Applying Spicetify changes to Spotify..." -ForegroundColor Yellow
& spicetify apply

Write-Host ""
Write-Host "SUCCESS: spoti-fly has been installed into your Spotify!" -ForegroundColor Green
Write-Host "Look for 'spoti-fly' in your left sidebar and the winged button in your topbar/playbar." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
