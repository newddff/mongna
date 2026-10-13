import { NextResponse } from 'next/server';
import { FLOW_COOKIE, publicError, requireOrigin, seal, setCookie, startFlow } from '../../../../../lib/server/soop-chat-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { pending, authUrl } = startFlow();
    const response = NextResponse.json({ authUrl, nonce: pending.nonce }, { headers: { 'Cache-Control': 'no-store' } });
    setCookie(response, FLOW_COOKIE, seal(pending, 'flow'), 600);
    return response;
  } catch (error) {
    const failure = publicError(error);
    return NextResponse.json({ error: failure.message, kind: failure.kind }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
