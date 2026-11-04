/**
 * spoti-fly Spicetify Extension
 * Companion launcher for the Spotifly Desktop Mini-Player
 */
(function SpotiflyExtension() {
  if (!Spicetify.Topbar || !Spicetify.showNotification) {
    setTimeout(SpotiflyExtension, 250);
    return;
  }

  if (window.__SPOTIFLY_BUTTON_REGISTERED__) return;
  window.__SPOTIFLY_BUTTON_REGISTERED__ = true;

  const wingedSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="#1DB954"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm2 1.5c3.2-1.8 7.5-1.2 9.5 1.5-1.8.2-3.8-.2-5.2-.8 2.2 1.6 3.5 3.8 3.5 6-2-.6-3.8-1.5-5.2-2.8l-2.6-3.9z"/></svg>';

  function showDownloadModal() {
    if (!Spicetify.PopupModal) {
      Spicetify.showNotification('Spotifly Desktop is not running. Please launch it or download from GitHub.');
      return;
    }

    const modal = document.createElement('div');
    modal.style.padding = '24px';
    modal.style.textAlign = 'center';
    modal.style.color = '#ffffff';

    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="56" height="56" fill="#1DB954" style="margin: 0 auto 16px auto; display: block;">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm2 1.5c3.2-1.8 7.5-1.2 9.5 1.5-1.8.2-3.8-.2-5.2-.8 2.2 1.6 3.5 3.8 3.5 6-2-.6-3.8-1.5-5.2-2.8l-2.6-3.9z"/>
        </svg>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 10px 0; color: #fff;">Spotifly Desktop is Not Running</h2>
        <p style="font-size: 14px; color: #b3b3b3; line-height: 1.6; margin: 0 auto; max-width: 420px;">
          Spotifly is an always-on-top floating desktop mini-player for Windows.<br/>
          To summon it, the desktop app must be installed and running on your PC.
        </p>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; align-items: center; margin-bottom: 20px;">
        <a href="https://github.com/Satsugingg/spoti-fly/releases" target="_blank" rel="noopener noreferrer"
           style="background: #1DB954; color: #000; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 500px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(29, 185, 84, 0.4);">
          Download Spotifly (.exe)
        </a>
      </div>

      <div style="font-size: 12px; color: #727272; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
        Already installed? Launch Spotifly on your PC and click this button again to bring it to the front.
      </div>
    `;

    Spicetify.PopupModal.display({
      title: 'Spotifly Companion',
      content: modal,
      isLarge: false,
    });
  }

  async function triggerLaunch() {
    // 1. Check if Spotifly is already active and listening on port 45454
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://127.0.0.1:45454/show', {
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      Spicetify.showNotification('Spotifly mini-player focused');
      return;
    } catch (_) {
      // Not listening on port 45454
    }

    // 2. Attempt protocol trigger in case the app is registered to wake via OS
    try {
      const a = document.createElement('a');
      a.href = 'spoti-fly://open/';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (_) {}

    // 3. Re-check after 700ms to see if protocol successfully launched the app
    setTimeout(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500);
        await fetch('http://127.0.0.1:45454/status', {
          mode: 'no-cors',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        Spicetify.showNotification('Spotifly launched');
      } catch (_) {
        // App is definitely not running or not installed -> show friendly modal
        showDownloadModal();
      }
    }, 700);
  }

  new Spicetify.Topbar.Button(
    'Spotifly',
    wingedSvg,
    triggerLaunch
  );
})();
