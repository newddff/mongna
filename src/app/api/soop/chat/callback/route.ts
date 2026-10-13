import { NextResponse } from 'next/server';
import { exchangeToken, FLOW_COOKIE, persistSession, publicError, requireOrigin, setCookie, verifyFlow, verifyRoom } from '../../../../../lib/server/soop-chat-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const text = await request.text();
    if (text.length > 8192) return NextResponse.json({ error: '요청이 너무 큽니다.' }, { status: 413 });
    const input = JSON.parse(text);
    verifyFlow(request, input.nonce);
    if (typeof input.code !== 'string' || !input.code || input.code.length > 4096) {
      return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
    }
    const session = await exchangeToken('authorization_code', input.code);
    await verifyRoom(session.accessToken, true);
    const response = NextResponse.json({ authenticated: true }, { headers: { 'Cache-Control': 'no-store' } });
    persistSession(response, session);
    setCookie(response, FLOW_COOKIE, '', 0);
    return response;
  } catch (error) {
    const failure = publicError(error);
    const response = NextResponse.json({ error: failure.message, kind: failure.kind }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
    // Preserve any existing valid host session on a failed or wrong-account callback.
    if (failure.kind !== 'configuration') setCookie(response, FLOW_COOKIE, '', 0);
    return response;
  }
}
