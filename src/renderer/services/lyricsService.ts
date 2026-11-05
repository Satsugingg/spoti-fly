export interface LyricLine {
  time: number; // In seconds
  text: string;
}

export interface LyricsData {
  lines: LyricLine[];
  isSynced: boolean;
  trackName: string;
  artistName: string;
}

const lyricsCache = new Map<string, LyricsData | null>();

export function parseLrcLyrics(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines: LyricLine[] = [];
  const rawLines = lrcText.split(/\r?\n/);

  // Regex to match one or more [mm:ss.xx] or [mm:ss] tags
  const tagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Collect all timestamps on this line
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    tagRegex.lastIndex = 0;

    while ((match = tagRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3] || '0';
      const millis = millisStr.length === 2 ? parseInt(millisStr, 10) * 10 : parseInt(millisStr, 10);
      const totalSeconds = minutes * 60 + seconds + millis / 1000;
      timestamps.push(totalSeconds);
    }

    if (timestamps.length > 0) {
      // Strip all tags from line to get text
      const text = trimmed.replace(tagRegex, '').trim();
      for (const time of timestamps) {
        lines.push({ time, text });
      }
    }
  }

  // Sort chronologically
  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(
  artist: string,
  title: string,
  duration?: number
): Promise<LyricsData | null> {
  const cleanTitle = title.replace(/\s*-\s*Remaster(?:ed)?(?:\s*\d+)?/gi, '')
    .replace(/\s*\([^)]*remaster[^)]*\)/gi, '')
    .replace(/\s*-\s*Live/gi, '')
    .trim();
  const cleanArtist = artist.split(/[,&]/)[0].trim();

  const cacheKey = `${cleanArtist} - ${cleanTitle}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null;
  }

  try {
    const params = new URLSearchParams({
      artist_name: cleanArtist,
      track_name: cleanTitle,
    });
    if (duration && duration > 0) {
      params.append('duration', String(Math.round(duration)));
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        const parsed = parseLrcLyrics(data.syncedLyrics);
        if (parsed.length > 0) {
          const result: LyricsData = {
            lines: parsed,
            isSynced: true,
            trackName: data.trackName || title,
            artistName: data.artistName || artist,
          };
          lyricsCache.set(cacheKey, result);
          return result;
        }
      }

      if (data.plainLyrics) {
        const lines: LyricLine[] = data.plainLyrics
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((text: string) => ({ time: 0, text }));

        if (lines.length > 0) {
          const result: LyricsData = {
            lines,
            isSynced: false,
            trackName: data.trackName || title,
            artistName: data.artistName || artist,
          };
          lyricsCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Network or parse error
  }

  lyricsCache.set(cacheKey, null);
  return null;
}
