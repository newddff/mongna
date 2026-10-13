import { NextResponse } from 'next/server';
import { ChatAuthError, FLOW_COOKIE, publicError, requireOrigin, seal, setCookie, startFlow } from '../../../../../lib/server/soop-chat-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const text = await request.text();
    if (text.length > 2048) throw new ChatAuthError('input', '요청이 너무 큽니다.', 413);
    let input: any;
    try { input = text ? JSON.parse(text) : {}; } catch {
      throw new ChatAuthError('input', '잘못된 인증 요청입니다.', 400);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ChatAuthError('input', '잘못된 인증 요청입니다.', 400);
    }
    const { pending, authUrl } = startFlow(input.returnTo, input.purpose);
    const response = NextResponse.json({ authUrl, nonce: pending.nonce }, { headers: { 'Cache-Control': 'no-store' } });
    setCookie(response, FLOW_COOKIE, seal(pending, 'flow'), 600);
    return response;
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message, kind: failure.kind }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
