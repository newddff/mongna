import { NextResponse } from 'next/server';
import { getWeeklyRanking } from '../../../lib/server/weekly-video-ranking';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET() {
  const data = await getWeeklyRanking();
  const ready = Object.values(data.rankings).every(group => group.status === 'ready');
  const failed = Object.values(data.rankings).every(group => group.status === 'error');
  return NextResponse.json({ ...data, clips: data.rankings.clip.items }, {
    status: failed ? 502 : 200,
    headers: { 'Cache-Control': ready ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=60' : 'no-store' },
  });
}
