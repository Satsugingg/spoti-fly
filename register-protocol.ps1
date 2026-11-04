$keyPath = "HKCU:\Software\Classes\spoti-fly"
if (-not (Test-Path $keyPath)) {
    New-Item -Path $keyPath -Force | Out-Null
}
Set-ItemProperty -Path $keyPath -Name "(Default)" -Value "URL:spoti-fly Protocol"
Set-ItemProperty -Path $keyPath -Name "URL Protocol" -Value ""

$cmdPath = "$keyPath\shell\open\command"
if (-not (Test-Path $cmdPath)) {
    New-Item -Path $cmdPath -Force | Out-Null
}
$vbsPath = Join-Path $PSScriptRoot "launch.vbs"
$directCommand = "wscript.exe `"$vbsPath`" `"%1`""

Set-ItemProperty -Path $cmdPath -Name "(Default)" -Value $directCommand

Write-Host "spoti-fly:// successfully registered to: $directCommand" -ForegroundColor Green
