import { NextResponse } from 'next/server';
import { chatConfig, persistSession, publicError, readSession, refreshSession, requireOrigin, SESSION_COOKIE, setCookie, verifyRoom } from '../../../../../lib/server/soop-chat-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const current = readSession(request);
    if (!current) return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
    const session = await refreshSession(current);
    const live = await verifyRoom(session.accessToken);
    const response = NextResponse.json({ authenticated: true, live,
      clientId: chatConfig().clientId, streamerId: session.streamerId,
      // Access token stays in memory in the SDK; refresh token never leaves the server cookie.
      ...(live ? { accessToken: session.accessToken, expiresAt: session.accessExpiresAt } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } });
    if (session !== current) persistSession(response, session);
    return response;
  } catch (error) {
    const failure = publicError(error);
    const response = NextResponse.json({ error: failure.message, kind: failure.kind }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
    if (failure.kind === 'reauth' || failure.kind === 'wrong_account') setCookie(response, SESSION_COOKIE, '', 0);
    return response;
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const response = NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
    setCookie(response, SESSION_COOKIE, '', 0);
    return response;
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
