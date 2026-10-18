import { koreanDate, parseSoopDate, rankVideos, WEEK_MS, VideoKind, RankingGroup, WeeklyRanking } from '../video-ranking';

// Public SOOP channel API used by the channel's clip/catch pages; no account tokens.
const ORIGIN = 'https://chapi.sooplive.com';
const MAX_PAGES = 10;
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export async function collectRanking(kind: VideoKind, from: number, to: number, fetcher: Fetcher = fetch): Promise<RankingGroup> {
  const rows: unknown[] = [];
  const seen = new Set<string>();
  // Bound total collection time, including pagination.
  const deadline = Date.now() + 20000;
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = new URL(`/api/pinktape8/vods/${kind}/all`, ORIGIN);
      const params = { page: String(page), per_page: '50', orderby: 'reg_date', start_date: koreanDate(from), end_date: koreanDate(to) };
      url.search = new URLSearchParams(params).toString();
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('deadline');
        try {
          response = await fetcher(url.href, { headers: { 'User-Agent': 'MongnaFanpage/1.0', Referer: 'https://www.sooplive.com/' }, cache: 'no-store', signal: AbortSignal.timeout(Math.min(8000, remaining)) });
          if (response.status >= 500 && attempt === 0) { await response.body?.cancel(); continue; }
          break;
        } catch (error) { if (attempt === 1) throw error; }
      }
      if (!response?.ok) throw new Error('upstream');
      const body = await response.json();
      if (!Array.isArray(body?.data) || (body.data.length && !body.data.some((row: any) => row.ucc?.file_type === kind.toUpperCase()))) throw new Error('unexpected feed');
      const signature = body.data.map((row: any) => row.title_no).join(',');
      if (body.data.length && seen.has(signature)) throw new Error('repeated page');
      seen.add(signature); rows.push(...body.data);
      const meta = body.meta;
      // The verified reg_date ordering lets us stop after crossing the time window.
      const dated = body.data.filter((row: any) => !row.pin).map((row: any) => parseSoopDate(row.reg_date));
      const crossedWindow = dated.length > 0 && dated.every((time: number | null) => time !== null && time < from);
      const finalPage = Number.isInteger(meta?.last_page) && meta.last_page >= 0 && page >= meta.last_page;
      if (!body.data.length || finalPage || crossedWindow || body.links?.next === null) return { status: 'ready', items: rankVideos(rows, kind, from, to) };
      if (page === MAX_PAGES) return { status: 'partial', items: rankVideos(rows, kind, from, to) };
    } catch {
      return { status: rows.length ? 'partial' : 'error', items: rankVideos(rows, kind, from, to) };
    }
  }
  return { status: 'partial', items: rankVideos(rows, kind, from, to) };
}
let cached: { expires: number; value: WeeklyRanking } | null = null;
let inFlight: Promise<WeeklyRanking> | null = null;
export async function getWeeklyRanking(): Promise<WeeklyRanking> {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const to = Date.now(), from = to - WEEK_MS;
    const [clip, catchGroup] = await Promise.all([collectRanking('clip', from, to), collectRanking('catch', from, to)]);
    const value: WeeklyRanking = { period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() }, updatedAt: new Date(to).toISOString(), rankings: { clip, catch: catchGroup } };
    cached = { value, expires: Date.now() + (clip.status === 'ready' && catchGroup.status === 'ready' ? 300000 : 30000) };
    return value;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
