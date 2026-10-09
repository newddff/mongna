import { NextResponse } from 'next/server';
import { expiredAdminSessionCookie, isAdminSession } from '../../../../lib/server/admin-session';

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAdminSession(request) }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.set('Set-Cookie', expiredAdminSessionCookie());
  return response;
}
