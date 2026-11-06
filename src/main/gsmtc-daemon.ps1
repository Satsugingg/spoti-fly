# Spotifly GSMTC & Process Polling Daemon for Windows
# Streams real-time media properties and playback status as JSON lines on stdout
# Supports WinRT GlobalSystemMediaTransportControls with automatic Win32 Spotify process & window title fallback

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
}[0]

function Await($WinRtTask, $ResultType, [int]$TimeoutMs = 1500) {
    if ($null -eq $WinRtTask) { return $null }
    try {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait($TimeoutMs) | Out-Null
        return $netTask.Result
    } catch {
        return $null
    }
}

$manager = $null
try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await $op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]) 5000
} catch {}

function Get-ActiveSession {
    if ($null -eq $script:manager) {
        try {
            $op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
            $script:manager = Await $op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]) 2000
        } catch {}
        if ($null -eq $script:manager) { return $null }
    }
    try {
        # Strictly target Spotify session among all active Windows media sessions
        $all = $script:manager.GetSessions()
        if ($null -ne $all -and $all.Count -gt 0) {
            foreach ($s in $all) {
                if ($null -ne $s.SourceAppUserModelId) {
                    $id = $s.SourceAppUserModelId.ToLower()
                    if ($id.Contains("spotify") -or $id -eq "spotify.exe") {
                        return $s
                    }
                }
            }
        }
        # Check current session ONLY IF it is Spotify (ignoring YouTube/browsers)
        $cur = $script:manager.GetCurrentSession()
        if ($null -ne $cur -and $null -ne $cur.SourceAppUserModelId) {
            $id = $cur.SourceAppUserModelId.ToLower()
            if ($id.Contains("spotify") -or $id -eq "spotify.exe") {
                return $cur
            }
        }
    } catch {}
    return $null
}

function Get-SpotifyProcessFallback {
    try {
        $procs = Get-Process -Name "spotify" -ErrorAction SilentlyContinue
        if ($null -eq $procs -or $procs.Count -eq 0) {
            return $null
        }

        # Look for the Spotify window with a title
        $mainProc = $procs | Where-Object { $null -ne $_.MainWindowTitle -and $_.MainWindowTitle.Trim().Length -gt 0 } | Select-Object -First 1
        if ($null -eq $mainProc) {
            return [PSCustomObject]@{
                title = "Spotify"
                artist = "Ready to Play"
                album = ""
                status = "Paused"
                position = 0.0
                duration = 0.0
                isShuffle = $false
                repeatMode = "off"
                source = "Spotify.exe (Process)"
            }
        }

        $wTitle = $mainProc.MainWindowTitle.Trim()
        if ($wTitle -eq "Spotify" -or $wTitle -eq "Spotify Premium" -or $wTitle -eq "Spotify Free") {
            return [PSCustomObject]@{
                title = "Spotify"
                artist = "Paused"
                album = ""
                status = "Paused"
                position = 0.0
                duration = 0.0
                isShuffle = $false
                repeatMode = "off"
                source = "Spotify.exe (Process)"
            }
        }

        # Playing format is standard across all desktop Spotify releases: "Artist - Song Title"
        $dashIdx = $wTitle.IndexOf(" - ")
        if ($dashIdx -gt 0) {
            $artistPart = $wTitle.Substring(0, $dashIdx).Trim()
            $titlePart = $wTitle.Substring($dashIdx + 3).Trim()
            return [PSCustomObject]@{
                title = $titlePart
                artist = $artistPart
                album = ""
                status = "Playing"
                position = 0.0
                duration = 0.0
                isShuffle = $false
                repeatMode = "off"
                source = "Spotify.exe (Process)"
            }
        }

        return [PSCustomObject]@{
            title = $wTitle
            artist = "Spotify"
            album = ""
            status = "Playing"
            position = 0.0
            duration = 0.0
            isShuffle = $false
            repeatMode = "off"
            source = "Spotify.exe (Process)"
        }
    } catch {
        return $null
    }
}

$lastTitle = ""
$lastArtist = ""
$lastStatus = ""
$lastPosition = -1.0
$lastShuffle = $null
$lastRepeat = ""
$lastTick = [Environment]::TickCount

Write-Output '{"type":"ready"}'
[System.GC]::Collect()

$loopCount = 0

while ($true) {
    $loopCount++
    if ($loopCount -ge 75) {
        $loopCount = 0
        [System.GC]::Collect()
    }
    try {
        $hasData = $false
        $session = Get-ActiveSession
        if ($null -ne $session) {
            $mediaOp = $session.TryGetMediaPropertiesAsync()
            $props = Await $mediaOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]) 1500
            $timeline = $session.GetTimelineProperties()
            $info = $session.GetPlaybackInfo()

            $title = if ($null -ne $props -and $null -ne $props.Title) { $props.Title } else { "" }
            $artist = if ($null -ne $props -and $null -ne $props.Artist) { $props.Artist } else { "" }
            $album = if ($null -ne $props -and $null -ne $props.AlbumTitle) { $props.AlbumTitle } else { "" }
            $status = if ($null -ne $info) { $info.PlaybackStatus.ToString() } else { "Closed" }
            $pos = if ($null -ne $timeline) { [Math]::Round($timeline.Position.TotalSeconds, 1) } else { 0.0 }
            $dur = if ($null -ne $timeline) { [Math]::Round($timeline.EndTime.TotalSeconds, 1) } else { 0.0 }
            $isShuffle = if ($null -ne $info -and $null -ne $info.IsShuffleActive) { [bool]$info.IsShuffleActive } else { $false }
            $repeatMode = if ($null -ne $info -and $null -ne $info.AutoRepeatMode) {
                switch ($info.AutoRepeatMode.ToString()) {
                    "Track" { "track" }
                    "List" { "context" }
                    default { "off" }
                }
            } else { "off" }

            if ($title.Trim().Length -gt 0) {
                $hasData = $true
                $now = [Environment]::TickCount
                $forceUpdate = ($now - $lastTick) -ge 1200

                if ($forceUpdate -or $title -ne $lastTitle -or $status -ne $lastStatus -or $isShuffle -ne $lastShuffle -or $repeatMode -ne $lastRepeat -or [Math]::Abs($pos - $lastPosition) -ge 1.0) {
                    $lastTitle = $title
                    $lastArtist = $artist
                    $lastStatus = $status
                    $lastPosition = $pos
                    $lastShuffle = $isShuffle
                    $lastRepeat = $repeatMode
                    $lastTick = $now

                    $payload = [PSCustomObject]@{
                        type = "update"
                        data = [PSCustomObject]@{
                            title = $title
                            artist = $artist
                            album = $album
                            status = $status
                            position = $pos
                            duration = $dur
                            isShuffle = $isShuffle
                            repeatMode = $repeatMode
                            source = $session.SourceAppUserModelId
                        }
                    }
                    $payload | ConvertTo-Json -Compress
                }
            }
        }

        # If GSMTC didn't yield an active song, check Win32 Spotify process & window title
        if (-not $hasData) {
            $fallback = Get-SpotifyProcessFallback
            if ($null -ne $fallback) {
                $hasData = $true
                $now = [Environment]::TickCount
                $forceUpdate = ($now - $lastTick) -ge 1500

                if ($forceUpdate -or $fallback.title -ne $lastTitle -or $fallback.status -ne $lastStatus -or $fallback.artist -ne $lastArtist) {
                    $lastTitle = $fallback.title
                    $lastArtist = $fallback.artist
                    $lastStatus = $fallback.status
                    $lastPosition = $fallback.position
                    $lastShuffle = $fallback.isShuffle
                    $lastRepeat = $fallback.repeatMode
                    $lastTick = $now

                    $payload = [PSCustomObject]@{
                        type = "update"
                        data = [PSCustomObject]@{
                            title = $fallback.title
                            artist = $fallback.artist
                            album = $fallback.album
                            status = $fallback.status
                            position = $fallback.position
                            duration = $fallback.duration
                            isShuffle = $fallback.isShuffle
                            repeatMode = $fallback.repeatMode
                            source = $fallback.source
                        }
                    }
                    $payload | ConvertTo-Json -Compress
                }
            }
        }

        # If neither GSMTC nor Spotify process exists, report idle
        if (-not $hasData) {
            if ($lastStatus -ne "NoSession") {
                $lastStatus = "NoSession"
                $lastTitle = ""
                $lastArtist = ""
                Write-Output '{"type":"idle"}'
            }
        }
    } catch {
        # Catch individual poll error without crashing loop
    }

    Start-Sleep -Milliseconds 400
}
