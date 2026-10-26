import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { getAdminFirestore } from '../../../../lib/server/admin-firestore';
import { adminSessionNeedsRenewal, createAdminSessionCookie, expiredAdminSessionCookie, isAdminSession } from '../../../../lib/server/admin-session';
import { CARD_COLLECTION, MAX_CHUNK, downloadUrl, openUpload, sameOrigin, startUpload, validId, validateCard } from '../../../../lib/server/bangsel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: { path: string[] } };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
async function body(request: Request) {
  const raw = await request.text();
  if (raw.length > 64000) throw new Error('방셀 데이터가 너무 큽니다.');
  return JSON.parse(raw);
}
async function handle(request: Request, { params }: Context) {
  const path = params.path.join('/'), method = request.method;
  if (method !== 'GET' && !sameOrigin(request)) return json({ error: '허용되지 않은 요청 출처입니다.' }, 403);
  if (path === 'session') {
    if (method === 'GET') {
      const response = json({ authenticated: isAdminSession(request) });
      if (adminSessionNeedsRenewal(request)) {
        const cookie = createAdminSessionCookie(); if (cookie) response.headers.set('Set-Cookie', cookie);
      }
      return response;
    }
    if (method === 'DELETE') {
      const response = json({ success: true }); response.headers.set('Set-Cookie', expiredAdminSessionCookie()); return response;
    }
    if (method === 'POST') {
      const configured = process.env.ADMIN_PASSWORD;
      if (!configured) return json({ error: '관리자 로그인이 설정되지 않았습니다.' }, 503);
      const { password } = await body(request);
      const a = Buffer.from(typeof password === 'string' ? password : ''), b = Buffer.from(configured);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: '비밀번호가 틀렸습니다.' }, 401);
      const cookie = createAdminSessionCookie();
      if (!cookie) return json({ error: '관리자 세션 설정이 필요합니다.' }, 503);
      const response = json({ authenticated: true }); response.headers.set('Set-Cookie', cookie); return response;
    }
  }
  const [resource, id] = params.path;
  if (resource === 'view' && params.path.length === 2 && method === 'GET' && validId(id)) {
    const snapshot = await getAdminFirestore().collection(CARD_COLLECTION).doc(id).get();
    return snapshot.exists ? json({ card: snapshot.data()?.card }) : json({ error: '삭제되었거나 존재하지 않는 방셀입니다.' }, 404);
  }
  if (!isAdminSession(request)) return json({ error: '관리자 로그인이 필요합니다.' }, 401);
  if (resource === 'cards') {
    const collection = getAdminFirestore().collection(CARD_COLLECTION);
    if (params.path.length === 1 && method === 'GET') {
      const snapshot = await collection.orderBy('updatedAt', 'desc').limit(200).get();
      return json({ cards: snapshot.docs.map(doc => ({ ...doc.data()?.card, serverId: doc.id })) });
    }
    if (params.path.length === 1 && method === 'POST') {
      const card = validateCard(await body(request)), serverId = randomBytes(16).toString('hex');
      await collection.doc(serverId).create({ card, updatedAt: Date.now() });
      return json({ card: { ...card, serverId } }, 201);
    }
    if (params.path.length === 2 && validId(id)) {
      if (method === 'PUT') {
        const card = validateCard(await body(request));
        try { await collection.doc(id).update({ card, updatedAt: Date.now() }); }
        catch (error: any) { if (error.code === 5) return json({ error: '이미 삭제된 방셀입니다.' }, 404); throw error; }
        return json({ card: { ...card, serverId: id } });
      }
      if (method === 'DELETE') { await collection.doc(id).delete(); return json({ success: true }); }
    }
  }
  if (path === 'media') {
    if (method === 'POST') {
      const { mime, size } = await body(request);
      return json({ upload: await startUpload(mime, size), chunkSize: MAX_CHUNK });
    }
    if (method === 'PUT') {
      const upload = openUpload(request.headers.get('x-upload-token') || '');
      const offset = Number(request.headers.get('x-upload-offset'));
      const chunk = Buffer.from(await request.arrayBuffer());
      if (!chunk.length || chunk.length > MAX_CHUNK || !Number.isSafeInteger(offset) || offset < 0 || offset + chunk.length > upload.size || (offset + chunk.length < upload.size && chunk.length % (256 * 1024) !== 0)) return json({ error: '업로드 조각 크기가 잘못되었습니다.' }, 400);
      const response = await fetch(upload.uri, { method: 'PUT', redirect: 'manual', headers: {
        'Content-Type': upload.mime, 'Content-Length': String(chunk.length), 'Content-Range': `bytes ${offset}-${offset + chunk.length - 1}/${upload.size}`,
      }, body: chunk });
      if (response.status === 308) {
        const range = response.headers.get('range')?.match(/^bytes=0-(\d+)$/);
        return json({ complete: false, offset: range ? Number(range[1]) + 1 : 0 });
      }
      if (!response.ok) return json({ error: '파일 업로드에 실패했습니다. 파일을 다시 선택해주세요.' }, 502);
      return json({ complete: true, url: downloadUrl(upload) });
    }
  }
  return json({ error: '지원하지 않는 요청입니다.' }, 404);
}
async function route(request: Request, context: Context) {
  try { return await handle(request, context); }
  catch (error) {
    console.error('Bangsel request failed', error instanceof Error ? error.message : 'unknown');
    if (context.params.path.join('/') === 'media' && (error as { code?: number })?.code === 404) {
      return json({ error: 'Firebase의 mongna-vod 프로젝트에서 Storage를 먼저 시작해주세요. 파일 저장소가 아직 준비되지 않았습니다.' }, 503);
    }
    if (context.params.path.join('/') === 'media' && (error as { code?: number })?.code === 403) {
      return json({ error: '서버에 파일 저장소 권한이 없습니다. Firebase 서비스 계정의 Storage 권한을 확인해주세요.' }, 503);
    }
    return json({ error: '처리하지 못했습니다. 입력값과 서버의 Firebase 저장소 설정을 확인해주세요.' }, 400);
  }
}
export { route as GET, route as POST, route as PUT, route as DELETE };
