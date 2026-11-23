export type SongRequest = { kind: 'link'; videoId: string } | { kind: 'search'; query: string };
export type Song = { videoId: string; title: string; requestedBy: string; userId: string };
export const SONG_OVERLAY_CHANNEL = 'mongna-song-overlay';
export const MAX_QUEUE = 20;

export function parseSongRequest(message: unknown): SongRequest | null {
  if (typeof message !== 'string' || message.length > 512) return null;
  const input = /^!신청곡\s+(.+)$/.exec(message.trim())?.[1].trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
      const host = url.hostname;
      const path = url.pathname.split('/');
      const id = host === 'youtu.be' ? (path.length === 2 ? path[1] : null)
        : ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)
          ? (url.pathname === '/watch' ? url.searchParams.get('v')
            : (path.length === 3 && path[1] === 'shorts' ? path[2] : null))
          : null;
      return id && /^[\w-]{11}$/.test(id) ? { kind: 'link', videoId: id } : null;
    } catch { return null; }
  }
  const song = /^(.+?)\s+-\s+(.+)$/.exec(input);
  if (!song || input.length > 100 || !song[1].trim() || !song[2].trim()) return null;
  return { kind: 'search', query: song.slice(1).map(part => part.trim().replace(/\s+/g, ' ')).join(' ') };
}
