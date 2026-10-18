import { NextResponse } from 'next/server';
import { getWeeklyRanking } from '../../../lib/server/weekly-video-ranking';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;
// Compatibility for the old homepage endpoint.
export async function GET() {
  const data = await getWeeklyRanking();
  const group = data.rankings.catch;
  return NextResponse.json({ clips: group.items, status: group.status, period: data.period, updatedAt: data.updatedAt }, {
    status: group.status === 'error' ? 502 : 200,
    headers: { 'Cache-Control': group.status === 'ready' ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=60' : 'no-store' },
  });
}
