import { NextResponse } from 'next/server';
import { CAFE_NOTICE_URL, latestBroadcastNotice } from '../../../lib/broadcast-notice';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'icn1';
export const maxDuration = 20;
const API = 'https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/31747136/menus/5/articles?page=1&pageSize=50&sortBy=TIME';
let cached: { expires: number; data: object } | null = null;
let inFlight: Promise<object> | null = null;
export async function GET() {
  try {
    if (!cached || cached.expires <= Date.now()) {
      if (!inFlight) inFlight = (async () => {
        let response: Response | undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await fetch(API, { headers: { 'User-Agent': 'MongnaFanpage/1.0', Referer: 'https://cafe.naver.com/', Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
            if (response.status >= 500 && attempt === 0) { await response.body?.cancel(); continue; }
            break;
          } catch (error) { if (attempt === 1) throw error; }
        }
        if (!response?.ok) throw new Error('Cafe unavailable');
        const notice = latestBroadcastNotice(await response.json());
        const data = { notice, sourceUrl: CAFE_NOTICE_URL, updatedAt: new Date().toISOString() };
        cached = { data, expires: Date.now() + 60000 };
        return data;
      })();
      try { await inFlight; } finally { inFlight = null; }
    }
    return NextResponse.json(cached!.data, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=30' } });
  } catch {
    return NextResponse.json({ notice: null, sourceUrl: CAFE_NOTICE_URL, error: '방송공지를 불러오지 못했습니다.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
