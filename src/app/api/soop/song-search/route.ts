import { NextResponse } from 'next/server';
import { readSession, requireOrigin, publicError } from '../../../../lib/server/soop-chat-auth';

export const runtime = 'nodejs';
const cache = new Map<string, { videoId: string; title: string; expires: number }>();
let searchBudget = 6;
let lastRefill = Date.now();
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (!readSession(request)) return json({ error: '몽나 SOOP 계정을 먼저 연결해주세요.' }, 401);
  } catch (error) {
    const failure = publicError(error);
    return json({ error: failure.message }, failure.status);
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : '';
  if (!query || query.length > 100) return json({ error: '검색어를 확인해주세요.' }, 400);
  const key = process.env.YOUTUBE_DATA_API_KEY?.trim() || process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return json({ error: '곡명 검색이 설정되지 않았어요. 유튜브 링크로 신청해주세요.' }, 503);

  const cacheKey = query.toLowerCase();
  const saved = cache.get(cacheKey);
  if (saved && saved.expires > Date.now()) return json({ videoId: saved.videoId, title: saved.title });
  const now = Date.now();
  searchBudget = Math.min(6, searchBudget + Math.max(0, now - lastRefill) / 3000);
  lastRefill = now;
  if (searchBudget < 1) return json({ error: '검색이 잠시 밀렸어요. 다시 신청하거나 유튜브 링크를 사용해주세요.' }, 429);
  searchBudget -= 1;

  const params = new URLSearchParams({
    key, q: query, part: 'snippet', type: 'video', maxResults: '1',
    videoCategoryId: '10', videoEmbeddable: 'true', videoSyndicated: 'true',
    safeSearch: 'strict', regionCode: 'KR', relevanceLanguage: 'ko',
  });
  try {
    const response = await fetch('https://www.googleapis.com/youtube/v3/search?' + params, {
      cache: 'no-store', signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return json({ error: '유튜브 검색을 이용할 수 없어요. 링크 신청은 계속 사용할 수 있어요.' }, 502);
    const result = (await response.json()).items?.[0];
    const videoId = result?.id?.videoId;
    const title = result?.snippet?.title;
    if (typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId) || typeof title !== 'string') {
      return json({ error: '재생 가능한 검색 결과가 없어요. 유튜브 링크로 신청해주세요.' }, 404);
    }
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { videoId, title, expires: Date.now() + 3600000 });
    return json({ videoId, title });
  } catch {
    return json({ error: '유튜브 검색에 실패했어요. 잠시 뒤 다시 시도해주세요.' }, 502);
  }
}
