import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { isAdminSession } from '../../../../lib/server/admin-session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 세션이 필요합니다.' }, { status: 401 });
  }
  // SameSite 보호 외에, 다른 출처에서 관리자 쿠키를 악용하지 못하도록 Origin도 확인합니다.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || (() => { try { return new URL(origin).host !== host; } catch { return true; } })()) {
    return NextResponse.json({ error: '허용되지 않은 요청 출처입니다.' }, { status: 403 });
  }
  try {
    if (Number(request.headers.get('content-length') || '0') > 12000) {
      return NextResponse.json({ error: '요청이 너무 큽니다.' }, { status: 413 });
    }
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: '잘못된 데이터입니다.' }, { status: 400 });
    }
    const { isLive, heroImg, ytChannelId, links } = body;
    if (typeof isLive !== 'boolean' || typeof heroImg !== 'string' || heroImg.length > 2048 ||
        typeof ytChannelId !== 'string' || ytChannelId.length > 200 ||
        !Array.isArray(links) || links.length > 20 || !links.every((link: unknown) => link && typeof link === 'object' && !Array.isArray(link) && ['title', 'sub', 'icon', 'url'].every(key => typeof (link as Record<string, unknown>)[key] === 'string' && ((link as Record<string, string>)[key]).length <= 2048))) {
      return NextResponse.json({ error: '설정 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const payload = { isLive, heroImg, ytChannelId, links };
    if (JSON.stringify(payload).length > 12000) {
      return NextResponse.json({ error: '설정 크기 초과' }, { status: 413 });
    }
    await setDoc(doc(db, 'mongna_calendar_data', 'home_settings_v2'), payload, { merge: true });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('홈 관리자 설정 저장 실패', error);
    return NextResponse.json({ error: '설정 저장에 실패했습니다.' }, { status: 500 });
  }
}
