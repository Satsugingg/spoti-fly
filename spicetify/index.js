/**
 * Spotifly - Spicetify Custom App
 * Glassmorphic Floating Mini-Player Hub for Spotify
 * 
 * Works directly inside the Spotify desktop client via Spicetify.
 */

(function () {
  const React = Spicetify.React;
  const { useState, useEffect, useRef, useCallback } = React;

  const SPOTIFLY_STYLES = `
.spotifly-app {
  padding: 24px 32px;
  max-width: 1100px;
  margin: 0 auto;
  color: #ffffff;
  font-family: var(--font-family, spotify-circular, Helvetica, Arial, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: spotiflyFadeIn 0.3s ease-out;
}
@keyframes spotiflyFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.spotifly-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 20px;
}
.spotifly-branding {
  display: flex;
  align-items: center;
  gap: 14px;
}
.spotifly-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
}
.spotifly-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(29, 185, 84, 0.15);
  color: #1DB954;
  border: 1px solid rgba(29, 185, 84, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.spotifly-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}
.spotifly-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.spotifly-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  user-select: none;
}
.spotifly-btn-primary {
  background: #1DB954;
  color: #000000;
  box-shadow: 0 4px 14px rgba(29, 185, 84, 0.35);
}
.spotifly-btn-primary:hover {
  background: #1ed760;
  transform: scale(1.03);
  box-shadow: 0 6px 20px rgba(29, 185, 84, 0.45);
}
.spotifly-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.spotifly-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(1.02);
}
.spotifly-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  align-items: start;
}
@media (max-width: 900px) {
  .spotifly-grid {
    grid-template-columns: 1fr;
  }
}
.spotifly-stage-card {
  background: rgba(24, 24, 24, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
}
.spotifly-stage-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.spotifly-player {
  width: 320px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12);
  background: #121212;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}
.spotifly-player.is-minimal {
  height: 72px;
}
.spotifly-player.is-standard {
  height: 130px;
}
.spotifly-player-bg {
  position: absolute;
  inset: -10px;
  background-size: cover;
  background-position: center;
  filter: blur(20px) brightness(0.65);
  opacity: 0.85;
  pointer-events: none;
}
.spotifly-player-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}
.spotifly-player-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px 12px;
  box-sizing: border-box;
}
.spotifly-card-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 0 2px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.spotifly-card-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}
.spotifly-main-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.spotifly-cover-art {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  background: #282828;
  flex-shrink: 0;
}
.spotifly-player.is-minimal .spotifly-cover-art {
  width: 38px;
  height: 38px;
  border-radius: 6px;
}
.spotifly-meta {
  flex: 1;
  min-width: 0;
}
.spotifly-track-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.2px;
}
.spotifly-track-artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.spotifly-minimal-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}
.spotifly-minimal-line {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spotifly-minimal-title {
  font-weight: 700;
  color: #ffffff;
}
.spotifly-minimal-sep {
  color: rgba(255, 255, 255, 0.4);
  margin: 0 4px;
}
.spotifly-minimal-artist {
  font-weight: 500;
  color: #d1d5db;
}
.spotifly-minimal-time {
  font-size: 10px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 3px;
}
.spotifly-controls-cluster {
  display: flex;
  align-items: center;
  gap: 4px;
}
.spotifly-icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.spotifly-icon-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  transform: scale(1.08);
}
.spotifly-icon-btn.is-active {
  color: #1DB954;
}
.spotifly-icon-btn.play-pause-btn {
  background: #ffffff;
  color: #000000;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.25);
}
.spotifly-icon-btn.play-pause-btn:hover {
  background: #1DB954;
  color: #000000;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.4);
}
.spotifly-progress-row {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.spotifly-timestamp {
  font-size: 9.5px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.5);
  min-width: 26px;
}
.spotifly-timestamp-right {
  text-align: right;
}
.spotifly-progress-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.spotifly-progress-fill {
  height: 100%;
  background: #1DB954;
  border-radius: 9999px;
  box-shadow: 0 0 8px rgba(29, 185, 84, 0.6);
  transition: width 0.1s linear;
}
.spotifly-features-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.spotifly-feature-card {
  background: rgba(24, 24, 24, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
}
.spotifly-feature-card:hover {
  border-color: rgba(29, 185, 84, 0.25);
  background: rgba(24, 24, 24, 0.6);
}
.spotifly-feature-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.spotifly-feature-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
}
.spotifly-toggle-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.spotifly-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.spotifly-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.spotifly-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #3e3e3e;
  transition: .3s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 9999px;
}
.spotifly-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
input:checked + .spotifly-slider {
  background-color: #1DB954;
}
input:checked + .spotifly-slider:before {
  transform: translateX(18px);
}
`;

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('spotifly-app-styles')) return;
    const style = document.createElement('style');
    style.id = 'spotifly-app-styles';
    style.textContent = SPOTIFLY_STYLES;
    document.head.appendChild(style);
  }

  // Resolve Spotify Image URI to CDN URL
  function resolveArtworkUrl(uri) {
    if (!uri) return null;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
    if (uri.startsWith('spotify:image:')) {
      return 'https://i.scdn.co/image/' + uri.replace('spotify:image:', '');
    }
    return uri;
  }

  // Format seconds to mm:ss
  function formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // SVG Icons
  const Icons = {
    Play: ({ size = 16, fill = "currentColor" }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill },
        React.createElement("path", { d: "M8 5v14l11-7z" })),
    Pause: ({ size = 16, fill = "currentColor" }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill },
        React.createElement("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" })),
    SkipBack: ({ size = 15 }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
        React.createElement("path", { d: "M6 6h2v12H6zm3.5 6l8.5 6V6z" })),
    SkipForward: ({ size = 15 }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
        React.createElement("path", { d: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" })),
    Shuffle: ({ size = 14, active = false }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: active ? "#1DB954" : "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("polyline", { points: "16 3 21 3 21 8" }),
        React.createElement("line", { x1: "4", y1: "20", x2: "21", y2: "3" }),
        React.createElement("polyline", { points: "21 16 21 21 16 21" }),
        React.createElement("line", { x1: "15", y1: "15", x2: "21", y2: "21" }),
        React.createElement("line", { x1: "4", y1: "4", x2: "9", y2: "9" })),
    Repeat: ({ size = 14, active = false }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: active ? "#1DB954" : "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("polyline", { points: "17 1 21 5 17 9" }),
        React.createElement("path", { d: "M3 11V9a4 4 0 0 1 4-4h14" }),
        React.createElement("polyline", { points: "7 23 3 19 7 15" }),
        React.createElement("path", { d: "M21 13v2a4 4 0 0 1-4 4H3" })),
    Pip: ({ size = 15 }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }),
        React.createElement("rect", { x: "12", y: "12", width: "8", height: "6", rx: "1", fill: "currentColor", opacity: "0.2" })),
    External: ({ size = 14 }) =>
      React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
        React.createElement("polyline", { points: "15 3 21 3 21 9" }),
        React.createElement("line", { x1: "10", y1: "14", x2: "21", y2: "3" })),
    WingedNote: () =>
      React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "#1DB954" },
        React.createElement("path", { d: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm2 1.5c3.2-1.8 7.5-1.2 9.5 1.5-1.8.2-3.8-.2-5.2-.8 2.2 1.6 3.5 3.8 3.5 6-2-.6-3.8-1.5-5.2-2.8l-2.6-3.9z" }))
  };

  // Main Spotifly Custom App Root
  function SpotiflyApp() {
    const [track, setTrack] = useState({
      title: "Waiting for playback...",
      artist: "Play a song in Spotify",
      album: "",
      artworkUrl: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      isShuffle: false,
      repeatMode: "off"
    });

    const [isMinimal, setIsMinimal] = useState(false);
    const [pipActive, setPipActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Sync state with Spicetify Player
    const syncTrackState = useCallback(() => {
      try {
        const p = Spicetify.Player;
        if (!p || !p.data) return;

        const item = p.data.item || {};
        const meta = item.metadata || {};
        const isPlaying = !p.data.is_paused;
        const duration = item.duration && item.duration.milliseconds
          ? Math.floor(item.duration.milliseconds / 1000)
          : (p.getDuration ? Math.floor(p.getDuration() / 1000) : 0);
        const position = p.getProgress ? Math.floor(p.getProgress() / 1000) : 0;
        const rawArt = meta.image_xlarge_url || meta.image_large_url || meta.image_url;
        const artworkUrl = resolveArtworkUrl(rawArt);
        const isShuffle = p.getShuffle ? p.getShuffle() : Boolean(p.data.playback_options && p.data.playback_options.shuffle);
        const rep = p.getRepeat ? p.getRepeat() : 0;
        const repeatMode = rep === 2 ? 'track' : rep === 1 ? 'context' : 'off';

        setTrack({
          title: meta.title || "No track playing",
          artist: meta.artist_name || "Spotify",
          album: meta.album_title || "",
          artworkUrl,
          isPlaying,
          position,
          duration,
          isShuffle,
          repeatMode
        });
      } catch (err) {
        console.error("[Spotifly] Sync error:", err);
      }
    }, []);

    // Initial listener setup
    useEffect(() => {
      ensureStyles();
      syncTrackState();

      const onSongChange = () => syncTrackState();
      try {
        if (window.Spicetify && Spicetify.Player && Spicetify.Player.addEventListener) {
          Spicetify.Player.addEventListener("songchange", onSongChange);
        }
      } catch (e) {}

      const interval = setInterval(syncTrackState, 800);

      return () => {
        try {
          if (window.Spicetify && Spicetify.Player && Spicetify.Player.removeEventListener) {
            Spicetify.Player.removeEventListener("songchange", onSongChange);
          }
        } catch (e) {}
        clearInterval(interval);
      };
    }, [syncTrackState]);

    // Native Spicetify Player Controls
    const handleTogglePlay = () => {
      try {
        if (Spicetify.Player.togglePlay) {
          Spicetify.Player.togglePlay();
        } else if (track.isPlaying) {
          Spicetify.Player.pause();
        } else {
          Spicetify.Player.play();
        }
        setTrack(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      } catch (e) {}
    };

    const handleNext = () => { try { Spicetify.Player.next(); } catch (e) {} };
    const handlePrev = () => { try { Spicetify.Player.back(); } catch (e) {} };
    const handleToggleShuffle = () => {
      try {
        if (Spicetify.Player.toggleShuffle) Spicetify.Player.toggleShuffle();
        setTrack(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
      } catch (e) {}
    };
    const handleToggleRepeat = () => {
      try {
        if (Spicetify.Player.toggleRepeat) Spicetify.Player.toggleRepeat();
        syncTrackState();
      } catch (e) {}
    };

    const handleSeek = (e) => {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const targetSec = Math.floor(ratio * (track.duration || 1));
        Spicetify.Player.seek(targetSec * 1000);
        setTrack(prev => ({ ...prev, position: targetSec }));
      } catch (e) {}
    };

    // Picture-in-Picture Floating Mini-Player Engine
    const handleTogglePiP = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setPipActive(false);
          return;
        }

        if (!canvasRef.current) {
          const c = document.createElement("canvas");
          c.width = 360;
          c.height = isMinimal ? 80 : 140;
          canvasRef.current = c;
        }

        if (!videoRef.current) {
          const v = document.createElement("video");
          v.muted = true;
          v.autoplay = true;
          v.playsInline = true;
          const stream = canvasRef.current.captureStream(30);
          v.srcObject = stream;
          videoRef.current = v;
        }

        const drawFrame = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.fillStyle = "#121212";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "#1DB954";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("spoti-fly", 16, 24);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(track.title.slice(0, 32), 16, 52);

          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "12px sans-serif";
          ctx.fillText(track.artist.slice(0, 36), 16, 72);

          const pct = track.duration > 0 ? track.position / track.duration : 0;
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(16, canvas.height - 18, canvas.width - 32, 4);

          ctx.fillStyle = "#1DB954";
          ctx.fillRect(16, canvas.height - 18, (canvas.width - 32) * pct, 4);
        };

        drawFrame();
        await videoRef.current.play();
        await videoRef.current.requestPictureInPicture();
        setPipActive(true);

        const pipTimer = setInterval(drawFrame, 1000);
        videoRef.current.addEventListener('leavepictureinpicture', () => {
          clearInterval(pipTimer);
          setPipActive(false);
        }, { once: true });

      } catch (err) {
        console.warn("[spoti-fly] PiP notice:", err);
      }
    };

    // Open / Focus Standalone Desktop App
    const handleOpenDesktopApp = () => {
      // 1. If running in background, ping local HTTP bridge
      try {
        fetch('http://127.0.0.1:45454/show', { mode: 'no-cors' }).catch(() => {});
      } catch (err) {}

      // 2. Direct anchor click to invoke Windows Protocol -> launch.bat
      try {
        const a = document.createElement('a');
        a.href = 'spoti-fly://open';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 500);
      } catch (err) {}

      // 3. Fallback window.open
      try {
        window.open('spoti-fly://open');
      } catch (err) {}

      if (window.Spicetify && Spicetify.showNotification) {
        Spicetify.showNotification("Opening spoti-fly...");
      }
    };

    const progressPercent = track.duration > 0
      ? Math.min(100, Math.max(0, (track.position / track.duration) * 100))
      : 0;

    return React.createElement("div", { className: "spotifly-app" },
      // Header Section
      React.createElement("div", { className: "spotifly-header" },
        React.createElement("div", { className: "spotifly-branding" },
          React.createElement(Icons.WingedNote, null),
          React.createElement("div", null,
            React.createElement("div", { className: "spotifly-title" },
              "spoti-fly",
              React.createElement("span", { className: "spotifly-badge" }, "Spicetify Edition")
            ),
            React.createElement("div", { className: "spotifly-subtitle" },
              "Glassmorphic Always-on-Top Mini-Player & Desktop Companion"
            )
          )
        ),
        React.createElement("div", { className: "spotifly-header-actions" },
          React.createElement("a", {
            className: "spotifly-btn spotifly-btn-primary",
            href: "spoti-fly://open",
            target: "_blank",
            rel: "noopener noreferrer",
            style: { textDecoration: "none" },
            onClick: () => {
              try { fetch('http://127.0.0.1:45454/show', { mode: 'no-cors' }).catch(() => {}); } catch(e){}
            }
          },
            React.createElement(Icons.External, null),
            "Open Desktop Mini-Player"
          ),
          React.createElement("button", {
            className: "spotifly-btn spotifly-btn-secondary",
            onClick: handleTogglePiP
          },
            React.createElement(Icons.Pip, null),
            pipActive ? "Exit Floating PiP" : "Pop-out PiP"
          ),
          React.createElement("button", {
            className: "spotifly-btn spotifly-btn-secondary",
            onClick: () => setIsMinimal(!isMinimal)
          },
            isMinimal ? "Standard View" : "Minimal View"
          )
        )
      ),

      // Two-Column Showcase Grid
      React.createElement("div", { className: "spotifly-grid" },
        // Left Column: Interactive Mini-Player Preview
        React.createElement("div", { className: "spotifly-stage-card" },
          React.createElement("div", { className: "spotifly-stage-title" },
            React.createElement("span", null, isMinimal ? "Minimal Layout (72px)" : "Standard Layout (130px)"),
            React.createElement("span", { style: { color: "#1DB954" } }, track.isPlaying ? "PLAYING" : "PAUSED")
          ),

          // Mini Player Card Component
          React.createElement("div", {
            className: "spotifly-player " + (isMinimal ? "is-minimal" : "is-standard")
          },
            // Cover Art Blurred Background
            track.artworkUrl && React.createElement("div", {
              className: "spotifly-player-bg",
              style: { backgroundImage: "url(" + track.artworkUrl + ")" }
            }),
            React.createElement("div", { className: "spotifly-player-overlay" }),

            // Player Inner Content
            React.createElement("div", { className: "spotifly-player-content" },
              // Card Top Bar
              React.createElement("div", { className: "spotifly-card-topbar" },
                React.createElement("div", { className: "spotifly-card-brand" },
                  React.createElement(Icons.WingedNote, null),
                  React.createElement("span", null, "spoti-fly")
                ),
                React.createElement("div", { style: { opacity: 0.6 } },
                  isMinimal ? "Minimal" : "Standard"
                )
              ),

              // Main Track & Control Row
              !isMinimal ? (
                React.createElement("div", { className: "spotifly-main-row" },
                  track.artworkUrl
                    ? React.createElement("img", {
                        src: track.artworkUrl,
                        alt: track.title,
                        className: "spotifly-cover-art"
                      })
                    : React.createElement("div", { className: "spotifly-cover-art" }),
                  React.createElement("div", { className: "spotifly-meta" },
                    React.createElement("div", { className: "spotifly-track-title" }, track.title),
                    React.createElement("div", { className: "spotifly-track-artist" }, track.artist)
                  ),
                  React.createElement("div", { className: "spotifly-controls-cluster" },
                    React.createElement("button", {
                      className: "spotifly-icon-btn",
                      onClick: handlePrev,
                      title: "Previous"
                    }, React.createElement(Icons.SkipBack, null)),
                    React.createElement("button", {
                      className: "spotifly-icon-btn play-pause-btn",
                      onClick: handleTogglePlay,
                      title: track.isPlaying ? "Pause" : "Play"
                    }, track.isPlaying ? React.createElement(Icons.Pause, null) : React.createElement(Icons.Play, null)),
                    React.createElement("button", {
                      className: "spotifly-icon-btn",
                      onClick: handleNext,
                      title: "Next"
                    }, React.createElement(Icons.SkipForward, null)),
                    React.createElement("button", {
                      className: "spotifly-icon-btn " + (track.isShuffle ? "is-active" : ""),
                      onClick: handleToggleShuffle,
                      title: "Shuffle"
                    }, React.createElement(Icons.Shuffle, { active: track.isShuffle })),
                    React.createElement("button", {
                      className: "spotifly-icon-btn " + (track.repeatMode !== "off" ? "is-active" : ""),
                      onClick: handleToggleRepeat,
                      title: "Repeat: " + track.repeatMode
                    }, React.createElement(Icons.Repeat, { active: track.repeatMode !== "off" }))
                  )
                )
              ) : (
                React.createElement("div", { className: "spotifly-main-row" },
                  track.artworkUrl
                    ? React.createElement("img", {
                        src: track.artworkUrl,
                        alt: track.title,
                        className: "spotifly-cover-art"
                      })
                    : React.createElement("div", { className: "spotifly-cover-art" }),
                  React.createElement("div", { className: "spotifly-minimal-meta" },
                    React.createElement("div", { className: "spotifly-minimal-line" },
                      React.createElement("span", { className: "spotifly-minimal-title" }, track.title),
                      React.createElement("span", { className: "spotifly-minimal-sep" }, " - "),
                      React.createElement("span", { className: "spotifly-minimal-artist" }, track.artist)
                    ),
                    React.createElement("div", { className: "spotifly-minimal-time" },
                      formatTime(track.position) + " / " + formatTime(track.duration)
                    )
                  )
                )
              ),

              // Progress Bar
              React.createElement("div", { className: "spotifly-progress-row" },
                React.createElement("span", { className: "spotifly-timestamp" }, formatTime(track.position)),
                React.createElement("div", {
                  className: "spotifly-progress-track",
                  onClick: handleSeek
                },
                  React.createElement("div", {
                    className: "spotifly-progress-fill",
                    style: { width: progressPercent + "%" }
                  })
                ),
                React.createElement("span", { className: "spotifly-timestamp spotifly-timestamp-right" },
                  formatTime(track.duration)
                )
              )
            )
          )
        ),

        // Right Column: Feature Controls & Desktop Launcher
        React.createElement("div", { className: "spotifly-features-panel" },
          // Floating Picture-in-Picture Card
          React.createElement("div", { className: "spotifly-feature-card" },
            React.createElement("div", { className: "spotifly-feature-title" },
              React.createElement(Icons.Pip, null),
              "Floating Picture-in-Picture Popout"
            ),
            React.createElement("div", { className: "spotifly-feature-desc" },
              "Pop out a system-level floating mini-player directly from your browser engine. Keeps current track title, artist, elapsed scrubber, and album artwork hovering above your windows."
            ),
            React.createElement("div", { style: { marginTop: "12px" } },
              React.createElement("button", {
                className: "spotifly-btn spotifly-btn-primary",
                onClick: handleTogglePiP
              },
                React.createElement(Icons.Pip, null),
                pipActive ? "Close Floating PiP" : "Launch Floating PiP Popout"
              )
            )
          ),

          // Minimal Player Mode Switcher
          React.createElement("div", { className: "spotifly-feature-card" },
            React.createElement("div", { className: "spotifly-feature-title" },
              "Ultra-Flat Minimal Mode"
            ),
            React.createElement("div", { className: "spotifly-feature-desc" },
              "Compresses the player into an ultra-clean 72px bar showing track title and artist side-by-side with elapsed time only, removing media control buttons for maximum screen real estate."
            ),
            React.createElement("div", { className: "spotifly-toggle-box" },
              React.createElement("span", { style: { fontSize: "12px", fontWeight: "600" } }, "Enable Minimal Player Mode"),
              React.createElement("label", { className: "spotifly-switch" },
                React.createElement("input", {
                  type: "checkbox",
                  checked: isMinimal,
                  onChange: (e) => setIsMinimal(e.target.checked)
                }),
                React.createElement("span", { className: "spotifly-slider" })
              )
            )
          ),

          // Standalone Windows Desktop App Card
          React.createElement("div", { className: "spotifly-feature-card" },
            React.createElement("div", { className: "spotifly-feature-title" },
              React.createElement(Icons.External, null),
              "Windows Standalone App (Monotonic Physics & Pinning)"
            ),
            React.createElement("div", { className: "spotifly-feature-desc" },
              "Also have the standalone spoti-fly Electron desktop app? It provides fluid exponential lerp dragging physics, 2-second idle auto-flattening, and true window pinning directly on Windows."
            ),
            React.createElement("div", { style: { marginTop: "12px" } },
              React.createElement("a", {
                className: "spotifly-btn spotifly-btn-primary",
                href: "spoti-fly://open",
                target: "_blank",
                rel: "noopener noreferrer",
                style: { textDecoration: "none" },
                onClick: () => {
                  try { fetch('http://127.0.0.1:45454/show', { mode: 'no-cors' }).catch(() => {}); } catch(e){}
                }
              },
                React.createElement(Icons.External, null),
                "Launch / Focus spoti-fly"
              )
            )
          )
        )
      )
    );
  }

  // Safe Error Boundary to prevent React render tree crashes
  class SpotiflyErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
      console.error("[spoti-fly] Component render error:", error, errorInfo);
    }
    render() {
      if (this.state.hasError) {
        return React.createElement("div", {
          style: { padding: "32px", color: "#fff", background: "#121212", borderRadius: "12px", margin: "24px" }
        },
          React.createElement("h2", null, "spoti-fly Mini-Player Hub"),
          React.createElement("p", { style: { color: "#b3b3b3" } }, "A render error occurred inside the custom view."),
          React.createElement("button", {
            className: "spotifly-btn spotifly-btn-primary",
            onClick: () => this.setState({ hasError: false })
          }, "Retry")
        );
      }
      return this.props.children;
    }
  }

  // Export render function for Spicetify router
  window["spoti-fly"] = window.Spotifly = {
    render: function () {
      ensureStyles();
      return React.createElement(SpotiflyErrorBoundary, null, React.createElement(SpotiflyApp, null));
    }
  };
})();

// Spicetify custom app entrypoint function
function render() {
  const app = window["spoti-fly"] || window.Spotifly;
  return app ? app.render() : null;
}
