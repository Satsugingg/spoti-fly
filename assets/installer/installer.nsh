!macro customInstall
  CreateShortcut "$DESKTOP\Spoti-Fly.lnk" "$INSTDIR\Spoti-Fly.exe" "" "$INSTDIR\Spoti-Fly.exe" 0
  CreateShortcut "$SMPROGRAMS\Spoti-Fly.lnk" "$INSTDIR\Spoti-Fly.exe" "" "$INSTDIR\Spoti-Fly.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Spoti-Fly.lnk"
  Delete "$SMPROGRAMS\Spoti-Fly.lnk"
!macroend
