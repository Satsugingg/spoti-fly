import { SpotifyTokens, TrackState } from '../../types/player';

export class SpotifyApiClient {
  private tokens: SpotifyTokens | null = null;
  private clientId: string = '';

  constructor(clientId?: string, tokens?: SpotifyTokens | null) {
    if (clientId) this.clientId = clientId;
    if (tokens) this.tokens = tokens;
  }

  public setClientId(clientId: string) {
    this.clientId = clientId;
  }

  public setTokens(tokens: SpotifyTokens | null) {
    this.tokens = tokens;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.tokens && this.tokens.accessToken);
  }

  private async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;

    // Check if token is expired (or will expire in 60s)
    if (Date.now() > this.tokens.expiresAt - 60000) {
      if (!this.tokens.refreshToken || !this.clientId) {
        return null;
      }
      try {
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refreshToken,
          client_id: this.clientId,
        });

        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (res.ok) {
          const data = await res.json();
          this.tokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || this.tokens.refreshToken,
            expiresAt: Date.now() + data.expires_in * 1000,
          };
          if (window.spotifly) {
            await window.spotifly.saveSpotifyTokens(this.tokens);
          }
          return this.tokens.accessToken;
        }
      } catch {
        return null;
      }
    }

    return this.tokens.accessToken;
  }

  public async fetchCurrentPlayback(): Promise<TrackState | null> {
    const token = await this.getValidAccessToken();
    if (!token) return null;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204 || res.status === 404) {
        return {
          title: 'Not Playing',
          artist: 'Spotify is idle',
          album: '',
          artworkUrl: null,
          isPlaying: false,
          position: 0,
          duration: 0,
          isShuffle: false,
          repeatMode: 'off',
          source: 'spotify',
          hasMedia: false,
          timestamp: Date.now(),
        };
      }

      if (res.ok) {
        const data = await res.json();
        const item = data.item;
        if (!item) return null;

        const images = item.album?.images || [];
        const artworkUrl = images.length > 0 ? images[0].url : null;
        const artistNames = item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';

        return {
          title: item.name || 'Unknown Track',
          artist: artistNames,
          album: item.album?.name || '',
          artworkUrl,
          isPlaying: Boolean(data.is_playing),
          position: Math.round((data.progress_ms || 0) / 1000),
          duration: Math.round((item.duration_ms || 0) / 1000),
          isShuffle: Boolean(data.shuffle_state),
          repeatMode: data.repeat_state || 'off',
          source: 'spotify',
          hasMedia: true,
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fetch error
    }

    return null;
  }

  public async togglePlayPause(currentlyPlaying: boolean): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const endpoint = currentlyPlaying
      ? 'https://api.spotify.com/v1/me/player/pause'
      : 'https://api.spotify.com/v1/me/player/play';

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  public async next(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const res = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  public async previous(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  public async seek(seconds: number): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const ms = Math.round(seconds * 1000);
    const res = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${ms}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  public async setShuffle(state: boolean): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/shuffle?state=${state}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.ok;
  }

  public async setRepeat(state: 'off' | 'track' | 'context'): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/repeat?state=${state}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.ok;
  }

  public async setVolume(volumePercent: number): Promise<boolean> {
    const token = await this.getValidAccessToken();
    if (!token) return false;
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${clamped}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async fetchQueueNext(): Promise<{ title: string; artist: string; artworkUrl: string | null } | null> {
    const token = await this.getValidAccessToken();
    if (!token) return null;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.queue && data.queue.length > 0) {
          const item = data.queue[0];
          const artworkUrl = item.album?.images?.[0]?.url || null;
          const artist = item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
          return {
            title: item.name || 'Unknown Track',
            artist,
            artworkUrl,
          };
        }
      }
    } catch {}
    return null;
  }
}

export const spotifyApi = new SpotifyApiClient();
