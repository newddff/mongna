import { NextResponse } from 'next/server';
import { isAdminSession } from '../../../../lib/server/admin-session';
import { getAdminFirestore } from '../../../../lib/server/admin-firestore';

export const runtime = 'nodejs';

const DOCUMENTS: Record<string, string[]> = {
  reward_data_v3: ['items'],
  reward_settings_v4: ['categories', 'menuImages', 'probImages', 'priceList'],
  song_book: ['list'],
};

export async function POST(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  }
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || (() => { try { return new URL(origin).host !== host; } catch { return true; } })()) {
    return NextResponse.json({ error: '허용되지 않은 요청 출처입니다.' }, { status: 403 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 900000) {
      return NextResponse.json({ error: '요청 크기 제한 초과' }, { status: 413 });
    }
    const input = JSON.parse(raw);
    const docId = input?.documentId;
    const data = input?.data;
    if (typeof docId !== 'string' || !Object.prototype.hasOwnProperty.call(DOCUMENTS, docId) ||
        !data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: '허용되지 않은 문서입니다.' }, { status: 400 });
    }
    const keys = Object.keys(data);
    if (!keys.length || keys.some(key => !DOCUMENTS[docId].includes(key))) {
      return NextResponse.json({ error: '허용되지 않은 필드입니다.' }, { status: 400 });
    }
    for (const [key, value] of Object.entries(data)) {
      if (['items', 'list', 'categories'].includes(key) && !Array.isArray(value)) {
        return NextResponse.json({ error: '목록 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      if (['menuImages', 'probImages', 'priceList'].includes(key) &&
          (!value || typeof value !== 'object' || Array.isArray(value))) {
        return NextResponse.json({ error: '설정 형식이 올바르지 않습니다.' }, { status: 400 });
      }
    }
    await getAdminFirestore().collection('mongna_calendar_data').doc(docId).set(data, { merge: true });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('업보/노래책 관리자 저장 실패', error);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }
}
