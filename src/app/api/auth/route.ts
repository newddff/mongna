import { NextResponse } from 'next/server';
import { createAdminSessionCookie, adminSessionConfigured } from '../../../lib/server/admin-session';

export async function POST(req: Request) {
  try {
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword) {
      return NextResponse.json({ success: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const body = await req.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password !== configuredPassword) {
      return NextResponse.json({ success: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // 기존 프론트엔드가 기대하는 {success:true}는 유지합니다.
    // ADMIN_SESSION_SECRET이 설정되면 새 보안 세션도 발급합니다.
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    if (adminSessionConfigured()) {
      const cookie = createAdminSessionCookie();
      if (cookie) response.headers.set('Set-Cookie', cookie);
    }
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
