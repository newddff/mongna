import { NextResponse } from 'next/server';
import { getAdminFirestore } from '../../../../lib/server/admin-firestore';
import { isAdminSession } from '../../../../lib/server/admin-session';

export const runtime = 'nodejs';
const ALLOWED = new Set(['wiki_data', 'streamer_directory', 'schedule_data', 'sidebar_state', 'category_colors']);

export async function POST(request: Request) {
  if (!isAdminSession(request)) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (!origin || (() => { try { return new URL(origin).host !== request.headers.get('host'); } catch { return true; } })()) {
    return NextResponse.json({ error: '허용되지 않은 출처입니다.' }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 500000) return NextResponse.json({ error: '요청이 너무 큽니다.' }, { status: 413 });
    const input = JSON.parse(raw);
    if (!ALLOWED.has(input?.documentId) || !input?.data || typeof input.data !== 'object' || Array.isArray(input.data)) {
      return NextResponse.json({ error: '허용되지 않은 저장 요청입니다.' }, { status: 400 });
    }
    await getAdminFirestore().collection('mongna_calendar_data').doc(input.documentId).set(input.data, { merge: true });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('관리자 데이터 저장 실패:', error);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }
}
