export type VideoKind = 'clip' | 'catch';
export type RankedVideo = {
  id: string; kind: VideoKind; title: string; thumb: string; views: number;
  url: string; publishedAt: string; creator: string;
};
export type RankingGroup = { status: 'ready' | 'partial' | 'error'; items: RankedVideo[] };
export type WeeklyRanking = {
  period: { from: string; to: string }; updatedAt: string;
  rankings: Record<VideoKind, RankingGroup>;
};
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;
export function koreanDate(time: number) { return new Date(time + KST).toISOString().slice(0, 10); }
export function parseSoopDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  // SOOP's timezone-less timestamps are Korean time, not the server timezone.
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const time = Date.parse(`${match[1]}T${match[2]}+09:00`);
  if (!Number.isFinite(time) || new Date(time + KST).toISOString().slice(0, 19) !== `${match[1]}T${match[2]}`) return null;
  return time;
}
function count(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).replace(/,/g, '');
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}
function thumbnail(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    if (!/(^|\.)(sooplive\.com|sooplive\.co\.kr|afreecatv\.com)$/.test(url.hostname)) return '';
    url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}
export function normalizeVideo(raw: any, kind: VideoKind, from: number, to: number): RankedVideo | null {
  if (!raw || raw.ucc?.file_type !== (kind === 'clip' ? 'CLIP' : 'CATCH')) return null;
  if (raw.badge?.bj_id != null && (typeof raw.badge.bj_id !== 'string' || raw.badge.bj_id.toLowerCase() !== 'pinktape8')) return null;
  if (raw.copyright?.del_flag === 'Y') return null;
  const id = String(raw.title_no || '');
  if (!/^[1-9]\d*$/.test(id)) return null;
  const time = parseSoopDate(raw.reg_date);
  if (time === null || time < from || time > to) return null;
  const views = count(raw.count?.vod_read_cnt) ?? count(raw.count?.read_cnt);
  if (views === null) return null;
  return {
    id, kind, title: typeof raw.title_name === 'string' && raw.title_name.trim() ? raw.title_name : '제목 없음',
    thumb: thumbnail(raw.ucc?.thumb), views, publishedAt: new Date(time).toISOString(),
    creator: typeof raw.user_nick === 'string' ? raw.user_nick : '',
    url: `https://vod.sooplive.com/player/${id}${kind === 'catch' ? '/catch' : ''}`,
  };
}
export function rankVideos(raw: unknown[], kind: VideoKind, from: number, to: number): RankedVideo[] {
  const unique = new Map<string, RankedVideo>();
  for (const row of raw) {
    const item = normalizeVideo(row, kind, from, to);
    if (item && (!unique.has(item.id) || unique.get(item.id)!.views < item.views)) unique.set(item.id, item);
  }
  return Array.from(unique.values()).sort((a, b) => b.views - a.views || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)).slice(0, 5);
}
