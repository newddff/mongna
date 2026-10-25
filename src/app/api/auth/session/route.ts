import { NextResponse } from 'next/server';
import { adminSessionNeedsRenewal, createAdminSessionCookie, expiredAdminSessionCookie, isAdminSession } from '../../../../lib/server/admin-session';

export async function GET(request: Request) {
  const response = NextResponse.json({ authenticated: isAdminSession(request) }, {
    headers: { 'Cache-Control': 'no-store' }
  });
  if (adminSessionNeedsRenewal(request)) {
    const cookie = createAdminSessionCookie();
    if (cookie) response.headers.set('Set-Cookie', cookie);
  }
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.set('Set-Cookie', expiredAdminSessionCookie());
  return response;
}
