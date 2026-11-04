/**
 * spoti-fly Spicetify Extension
 */
(function SpotiflyExtension() {
  if (!Spicetify.Topbar || !Spicetify.showNotification) {
    setTimeout(SpotiflyExtension, 250);
    return;
  }

  if (window.__SPOTIFLY_BUTTON_REGISTERED__) return;
  window.__SPOTIFLY_BUTTON_REGISTERED__ = true;

  const wingedSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="#1DB954"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm2 1.5c3.2-1.8 7.5-1.2 9.5 1.5-1.8.2-3.8-.2-5.2-.8 2.2 1.6 3.5 3.8 3.5 6-2-.6-3.8-1.5-5.2-2.8l-2.6-3.9z"/></svg>';

  function triggerLaunch() {
    Spicetify.showNotification('Launching spoti-fly...');

    // 1. If the app is already running, focus it via its local HTTP endpoint
    fetch('http://127.0.0.1:45454/show', { mode: 'no-cors' }).catch(function () {});

    // 2. Synchronous protocol trigger (must execute on user click, NOT in .catch)
    try {
      const a = document.createElement('a');
      a.href = 'spoti-fly://open/';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('[Spotifly] Protocol trigger error:', err);
    }
  }

  new Spicetify.Topbar.Button(
    'Spotifly',
    wingedSvg,
    triggerLaunch
  );
})();