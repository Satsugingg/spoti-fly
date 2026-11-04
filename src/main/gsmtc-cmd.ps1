param(
    [string]$Action,
    [string]$Value
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
}[0]

function Await($WinRtTask, $ResultType) {
    if ($null -eq $WinRtTask) { return $null }
    try {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(2000) | Out-Null
        return $netTask.Result
    } catch {
        return $null
    }
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$manager = Await $op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if (-not $manager) { exit 1 }

$session = $null
$sessions = $manager.GetSessions()
if ($null -ne $sessions) {
    foreach ($s in $sessions) {
        if ($null -ne $s.SourceAppUserModelId -and $s.SourceAppUserModelId.ToLower().Contains("spotify")) {
            $session = $s
            break
        }
    }
}

if (-not $session) {
    $cur = $manager.GetCurrentSession()
    if ($null -ne $cur -and $null -ne $cur.SourceAppUserModelId -and $cur.SourceAppUserModelId.ToLower().Contains("spotify")) {
        $session = $cur
    }
}

if (-not $session) {
    # Do NOT fall back to YouTube/browser or other media sessions
    exit 2
}

switch ($Action.ToLower()) {
    "toggle" {
        $null = Await ($session.TryTogglePlayPauseAsync()) ([bool])
    }
    "playpause" {
        $null = Await ($session.TryTogglePlayPauseAsync()) ([bool])
    }
    "play" {
        $null = Await ($session.TryPlayAsync()) ([bool])
    }
    "pause" {
        $null = Await ($session.TryPauseAsync()) ([bool])
    }
    "next" {
        $null = Await ($session.TrySkipNextAsync()) ([bool])
    }
    "prev" {
        $null = Await ($session.TrySkipPreviousAsync()) ([bool])
    }
    "seek" {
        $sec = [double]$Value
        $ticks = [long]($sec * 10000000)
        $null = Await ($session.TryChangePlaybackPositionAsync($ticks)) ([bool])
    }
    "shuffle" {
        $active = [System.Convert]::ToBoolean($Value)
        $null = Await ($session.TryChangeShuffleActiveAsync($active)) ([bool])
    }
    "repeat" {
        [Windows.Media.MediaPlaybackAutoRepeatMode, Windows.Media, ContentType = WindowsRuntime] | Out-Null
        $mode = switch ($Value.ToLower()) {
            "track" { [Windows.Media.MediaPlaybackAutoRepeatMode]::Track }
            "context" { [Windows.Media.MediaPlaybackAutoRepeatMode]::List }
            default { [Windows.Media.MediaPlaybackAutoRepeatMode]::None }
        }
        $null = Await ($session.TryChangeAutoRepeatModeAsync($mode)) ([bool])
    }
}
