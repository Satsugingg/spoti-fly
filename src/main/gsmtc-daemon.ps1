# Spotifly GSMTC Polling Daemon for Windows
# Streams real-time media properties and playback status as JSON lines on stdout

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
}[0]

function Await($WinRtTask, $ResultType) {
    if ($null -eq $WinRtTask) { return $null }
    try {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(500) | Out-Null
        return $netTask.Result
    } catch {
        return $null
    }
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$manager = Await $op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

if ($null -eq $manager) {
    Write-Output '{"type":"error","message":"Failed to initialize GSMTC manager"}'
    exit 1
}

function Get-ActiveSession {
    try {
        # Strictly target Spotify session among all active Windows media sessions
        $all = $manager.GetSessions()
        if ($null -ne $all -and $all.Count -gt 0) {
            foreach ($s in $all) {
                if ($null -ne $s.SourceAppUserModelId -and $s.SourceAppUserModelId.ToLower().Contains("spotify")) {
                    return $s
                }
            }
        }
        # Check current session ONLY IF it is Spotify (ignoring YouTube/browsers)
        $cur = $manager.GetCurrentSession()
        if ($null -ne $cur -and $null -ne $cur.SourceAppUserModelId -and $cur.SourceAppUserModelId.ToLower().Contains("spotify")) {
            return $cur
        }
    } catch {}
    return $null
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
        $session = Get-ActiveSession
        if ($null -ne $session) {
            $mediaOp = $session.TryGetMediaPropertiesAsync()
            $props = Await $mediaOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
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
        } else {
            if ($lastStatus -ne "NoSession") {
                $lastStatus = "NoSession"
                Write-Output '{"type":"idle"}'
            }
        }
    } catch {
        # Catch individual poll error without crashing loop
    }

    Start-Sleep -Milliseconds 400
}
