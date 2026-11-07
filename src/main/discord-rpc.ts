import net from 'net';
import { TrackState } from '../types/player';

export const DEFAULT_DISCORD_CLIENT_ID = '1522058393898975252';
const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/Satsugingg/spoti-fly/main/public/logo.png';

export interface DiscordRpcOptions {
  enabled?: boolean;
  clientId?: string;
  onLog?: (msg: string) => void;
}

export class DiscordRpcClient {
  private enabled: boolean;
  private clientId: string;
  private socket: net.Socket | null = null;
  private isConnected = false;
  private isReady = false;
  private isDestroyed = false;
  private currentPipeIndex = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private incomingBuffer: Buffer = Buffer.alloc(0);
  private pendingTrack: TrackState | null = null;
  private lastActivityPayload: string | null = null;
  private onLog?: (msg: string) => void;

  constructor(options: DiscordRpcOptions = {}) {
    this.enabled = options.enabled !== false;
    this.clientId = (options.clientId && options.clientId.trim()) || DEFAULT_DISCORD_CLIENT_ID;
    this.onLog = options.onLog;

    if (this.enabled) {
      this.connect();
    }
  }

  private log(msg: string) {
    if (this.onLog) {
      this.onLog(`[DISCORD] ${msg}`);
    }
  }

  public updateConfig(enabled: boolean, customClientId?: string) {
    const trimmedId = (customClientId && customClientId.trim()) || DEFAULT_DISCORD_CLIENT_ID;
    const clientChanged = trimmedId !== this.clientId;
    const stateChanged = enabled !== this.enabled;

    this.enabled = enabled;
    this.clientId = trimmedId;

    if (!this.enabled) {
      this.log('Discord RPC disabled by user settings.');
      this.clearActivity();
      this.disconnect();
      return;
    }

    if (clientChanged || stateChanged || (!this.isConnected && !this.socket)) {
      this.log(`Reconnecting Discord RPC with Client ID: ${this.clientId}`);
      this.disconnect();
      this.connect();
    }
  }

  public connect() {
    if (this.isDestroyed || !this.enabled || this.socket) return;
    this.currentPipeIndex = 0;
    this.tryNextPipe();
  }

  private tryNextPipe() {
    if (this.isDestroyed || !this.enabled) return;

    if (this.currentPipeIndex > 9) {
      // Finished probing all 10 pipes without connecting; wait and retry later
      this.scheduleReconnect(15000);
      return;
    }

    const pipePath = `\\\\?\\pipe\\discord-ipc-${this.currentPipeIndex}`;
    const nextIdx = this.currentPipeIndex + 1;

    let socket: net.Socket | null = null;
    let didConnect = false;

    try {
      socket = net.connect(pipePath, () => {
        didConnect = true;
        this.socket = socket;
        this.isConnected = true;
        this.incomingBuffer = Buffer.alloc(0);
        this.log(`Connected to Discord pipe ${pipePath}`);
        this.sendHandshake();
      });
    } catch {
      this.currentPipeIndex = nextIdx;
      this.tryNextPipe();
      return;
    }

    socket.on('data', (chunk: Buffer) => {
      this.handleData(chunk);
    });

    socket.on('error', (err: any) => {
      if (!didConnect) {
        socket?.destroy();
        this.currentPipeIndex = nextIdx;
        this.tryNextPipe();
      } else {
        this.log(`Socket error: ${err.message || err}`);
      }
    });

    socket.on('close', () => {
      if (this.socket === socket) {
        this.handleDisconnect();
      }
    });
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.isReady = false;
    this.socket = null;
    this.incomingBuffer = Buffer.alloc(0);
    this.lastActivityPayload = null;

    if (!this.isDestroyed && this.enabled) {
      this.scheduleReconnect(10000);
    }
  }

  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isConnected = false;
    this.isReady = false;
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.incomingBuffer = Buffer.alloc(0);
    this.lastActivityPayload = null;
  }

  private scheduleReconnect(delayMs: number) {
    if (this.reconnectTimer || this.isDestroyed || !this.enabled) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentPipeIndex = 0;
      this.tryNextPipe();
    }, delayMs);
  }

  private sendHandshake() {
    if (!this.socket || !this.isConnected) return;
    this.log(`Sending Handshake with client_id: ${this.clientId}`);
    const payload = { v: 1, client_id: this.clientId };
    this.sendPacket(0, payload);
  }

  private sendPacket(opcode: number, payload: object) {
    if (!this.socket || !this.isConnected) return;
    try {
      const jsonBuf = Buffer.from(JSON.stringify(payload), 'utf8');
      const header = Buffer.alloc(8);
      header.writeInt32LE(opcode, 0);
      header.writeInt32LE(jsonBuf.length, 4);
      this.socket.write(Buffer.concat([header, jsonBuf]));
    } catch (err: any) {
      this.log(`Error writing packet: ${err.message}`);
    }
  }

  private handleData(chunk: Buffer) {
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]);

    while (this.incomingBuffer.length >= 8) {
      const opcode = this.incomingBuffer.readInt32LE(0);
      const length = this.incomingBuffer.readInt32LE(4);

      if (this.incomingBuffer.length < 8 + length) {
        break; // Wait for full packet
      }

      const bodyBuf = this.incomingBuffer.subarray(8, 8 + length);
      this.incomingBuffer = this.incomingBuffer.subarray(8 + length);

      try {
        const parsed = JSON.parse(bodyBuf.toString('utf8'));
        this.handlePacket(opcode, parsed);
      } catch (e: any) {
        this.log(`JSON parse error from pipe: ${e.message}`);
      }
    }
  }

  private handlePacket(opcode: number, packet: any) {
    if (opcode === 1) { // Frame
      if (packet.evt === 'READY') {
        this.isReady = true;
        const user = packet.data?.user?.username || 'user';
        this.log(`Handshake complete! Logged in as ${user}`);
        if (this.pendingTrack) {
          this.dispatchActivity(this.pendingTrack);
        }
      } else if (packet.cmd === 'SET_ACTIVITY') {
        const details = packet.data?.details || '(cleared)';
        const appName = packet.data?.name || 'Spoti-Fly';
        this.log(`Presence confirmed by Discord: [${appName}] ${details}`);
      } else if (packet.evt === 'ERROR') {
        this.log(`Discord returned error: ${JSON.stringify(packet.data)}`);
      }
    } else if (opcode === 2) { // Close
      this.log(`Discord closed session: ${JSON.stringify(packet)}`);
      this.socket?.destroy();
    }
  }

  public setActivity(track: TrackState | null) {
    this.pendingTrack = track;
    if (!this.enabled) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce updates by 250ms to respect Discord rate-limits
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.dispatchActivity(this.pendingTrack);
    }, 250);
  }

  private dispatchActivity(track: TrackState | null) {
    if (!this.enabled || !this.socket || !this.isReady) {
      return;
    }

    if (!track || !track.hasMedia || !track.title || track.title === 'Not Playing') {
      this.clearActivity();
      return;
    }

    this.log(`Dispatching to Discord: "${track.title}" by ${track.artist || 'Unknown'} (${track.isPlaying ? 'Playing' : 'Paused'})`);

    let stateStr = track.artist || '';
    if (track.album && track.album !== track.title) {
      stateStr = stateStr ? `${stateStr} • ${track.album}` : track.album;
    }
    stateStr = stateStr.slice(0, 128);

    const detailsStr = track.title.slice(0, 128);

    // Timestamps: live progress seekbar appears in Discord when both start and end are provided in seconds
    let timestamps: { start: number; end?: number } | undefined = undefined;
    if (track.isPlaying && track.duration > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const posSec = Math.max(0, Math.floor(track.position || 0));
      const startSec = Math.max(0, nowSec - posSec);
      const endSec = startSec + Math.round(track.duration);
      timestamps = { start: startSec, end: endSec };
    }

    const largeImageUrl = (track.artworkUrl && track.artworkUrl.startsWith('https://'))
      ? track.artworkUrl
      : DEFAULT_LOGO_URL;

    const largeText = (track.album || track.title || 'Spoti-Fly').slice(0, 128);
    const smallText = track.isPlaying ? 'Playing on Spoti-Fly' : 'Paused on Spoti-Fly';

    const searchQuery = encodeURIComponent(`${track.title} ${track.artist}`.trim());
    const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;

    const activityPayload: any = {
      type: 2, // "Listening to..."
      details: detailsStr,
      state: stateStr || undefined,
      timestamps,
      assets: {
        large_image: largeImageUrl,
        large_text: largeText,
        small_image: DEFAULT_LOGO_URL,
        small_text: smallText,
      },
      buttons: [
        { label: 'Listen on Spotify', url: spotifySearchUrl },
        { label: 'Get Spoti-Fly', url: 'https://github.com/Satsugingg/spoti-fly' },
      ],
    };

    const serialized = JSON.stringify(activityPayload);
    if (serialized === this.lastActivityPayload) {
      return; // Deduplicate identical activity states
    }
    this.lastActivityPayload = serialized;

    const frame = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activityPayload,
      },
      nonce: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.sendPacket(1, frame);
  }

  public clearActivity() {
    if (!this.socket || !this.isReady) {
      this.lastActivityPayload = null;
      return;
    }

    if (this.lastActivityPayload === null) {
      return;
    }
    this.lastActivityPayload = null;

    const frame = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: null,
      },
      nonce: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.sendPacket(1, frame);
  }

  public destroy() {
    this.isDestroyed = true;
    this.clearActivity();
    setTimeout(() => {
      this.disconnect();
    }, 200);
  }
}
