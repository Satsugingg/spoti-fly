import { spawn, execFile, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { TrackState, PlaybackCommand } from '../types/player';

export class GsmtcBridge {
  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private currentTrack: TrackState = {
    title: 'Not Playing',
    artist: 'Spotify',
    album: '',
    artworkUrl: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    isShuffle: false,
    repeatMode: 'off',
    source: 'gsmtc',
    hasMedia: false,
    timestamp: Date.now(),
  };
  private onUpdateCallback: ((track: TrackState) => void) | null = null;
  private artCache = new Map<string, string>();
  private isDestroyed = false;

  constructor(onUpdate?: (track: TrackState) => void) {
    if (onUpdate) {
      this.onUpdateCallback = onUpdate;
    }
    this.start();
  }

  public setUpdateListener(callback: (track: TrackState) => void) {
    this.onUpdateCallback = callback;
    if (this.currentTrack.hasMedia) {
      callback(this.currentTrack);
    }
  }

  public getCurrentTrack(): TrackState {
    return this.currentTrack;
  }

  private getScriptPath(filename: string): string {
    const p1 = path.resolve(__dirname, filename);
    const unpacked = p1.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) return unpacked;

    // Automatic extraction fallback: if bundled in app.asar, extract to userData scripts folder
    try {
      const appData = process.env.APPDATA || process.env.USERPROFILE || '';
      if (appData) {
        const scriptsDir = path.join(appData, 'spoti-fly', 'scripts');
        if (!fs.existsSync(scriptsDir)) {
          fs.mkdirSync(scriptsDir, { recursive: true });
        }
        const targetPath = path.join(scriptsDir, filename);
        if (fs.existsSync(p1)) {
          const content = fs.readFileSync(p1);
          fs.writeFileSync(targetPath, content);
          return targetPath;
        }
      }
    } catch {}

    if (fs.existsSync(p1)) return p1;
    const p2 = path.resolve(process.cwd(), 'src/main', filename);
    if (fs.existsSync(p2)) return p2;
    const p3 = path.resolve(process.cwd(), 'dist/main', filename);
    if (fs.existsSync(p3)) return p3;
    return p1;
  }

  private start() {
    if (this.isDestroyed) return;

    const scriptPath = this.getScriptPath('gsmtc-daemon.ps1');
    try {
      this.process = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
      ]);

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          this.handleLine(line.trim());
        }
      });

      this.process.stderr.on('data', (err) => {
        // console.error('[GSMTC Stderr]:', err.toString());
      });

      this.process.on('close', (code) => {
        if (!this.isDestroyed) {
          // Restart daemon after delay if closed unexpectedly
          setTimeout(() => this.start(), 2000);
        }
      });
    } catch (e) {
      console.error('[GSMTC Bridge Error]:', e);
    }
  }

  private async handleLine(line: string) {
    if (!line || !line.startsWith('{')) return;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'update' && parsed.data) {
        const d = parsed.data;
        const isPlaying = d.status === 'Playing';
        const hasMedia = Boolean(d.title && d.title.trim().length > 0);

        let artworkUrl = this.currentTrack.artworkUrl;
        const trackKey = `${d.artist || ''} - ${d.title || ''}`;

        if (hasMedia && trackKey !== `${this.currentTrack.artist} - ${this.currentTrack.title}`) {
          artworkUrl = await this.resolveArtwork(d.artist, d.title, d.album);
        }

        this.currentTrack = {
          title: d.title || 'Unknown Title',
          artist: d.artist || 'Unknown Artist',
          album: d.album || '',
          artworkUrl,
          isPlaying,
          position: typeof d.position === 'number' ? d.position : 0,
          duration: typeof d.duration === 'number' ? d.duration : 0,
          isShuffle: Boolean(d.isShuffle),
          repeatMode: d.repeatMode || 'off',
          source: 'gsmtc',
          hasMedia,
          timestamp: Date.now(),
        };

        if (this.onUpdateCallback) {
          this.onUpdateCallback(this.currentTrack);
        }
      } else if (parsed.type === 'idle') {
        this.currentTrack = {
          title: 'Ready for Music',
          artist: 'Open Spotify to begin',
          album: '',
          artworkUrl: null,
          isPlaying: false,
          position: 0,
          duration: 0,
          isShuffle: false,
          repeatMode: 'off',
          source: 'gsmtc',
          hasMedia: false,
          timestamp: Date.now(),
        };
        if (this.onUpdateCallback) {
          this.onUpdateCallback(this.currentTrack);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private async resolveArtwork(artist?: string, title?: string, album?: string): Promise<string | null> {
    const key = `${artist || ''} - ${title || ''}`.toLowerCase().trim();
    if (this.artCache.has(key)) {
      return this.artCache.get(key) || null;
    }

    try {
      const query = encodeURIComponent(`${artist || ''} ${title || ''}`.trim());
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
          const highRes = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
          this.artCache.set(key, highRes);
          return highRes;
        }
      }
    } catch {
      // Artwork fallback
    }

    return null;
  }

  private runGsmtcCmd(action: string, value: string) {
    const scriptPath = this.getScriptPath('gsmtc-cmd.ps1');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', action, '-Value', value],
      (err, _stdout, stderr) => {
        if (err) {
          console.error(`[gsmtc-cmd ${action} error]:`, err, stderr);
        }
      }
    );
  }

  public sendCommand(command: PlaybackCommand, extra?: { position?: number }) {
    if (command === 'toggle' || command === 'play' || command === 'pause' || command === 'next' || command === 'prev') {
      const act = command === 'toggle' ? 'playpause' : command;
      this.runGsmtcCmd(act, '');
      return;
    }

    if (command === 'seek' && typeof extra?.position === 'number') {
      this.runGsmtcCmd('seek', extra.position.toFixed(1));
      this.currentTrack.position = extra.position;
      if (this.onUpdateCallback) this.onUpdateCallback(this.currentTrack);
    }
  }

  public setShuffle(active: boolean) {
    this.runGsmtcCmd('shuffle', active ? 'true' : 'false');
    this.currentTrack.isShuffle = active;
    if (this.onUpdateCallback) this.onUpdateCallback(this.currentTrack);
  }

  public setRepeat(mode: 'off' | 'track' | 'context') {
    this.runGsmtcCmd('repeat', mode);
    this.currentTrack.repeatMode = mode;
    if (this.onUpdateCallback) this.onUpdateCallback(this.currentTrack);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.process) {
      try {
        this.sendCommand('quit' as any);
        this.process.kill();
      } catch {}
      this.process = null;
    }
  }
}
