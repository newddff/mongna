import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAdminFirestore } from './admin-firestore';

export const CARD_COLLECTION = 'mongna_bangsel_cards';
export const MAX_CHUNK = 3 * 1024 * 1024;
export const MEDIA_TYPES: Record<string, number> = {
  'image/jpeg': 20, 'image/png': 20, 'image/gif': 20, 'image/webp': 20,
  'video/mp4': 100, 'video/webm': 100, 'video/quicktime': 100,
};
export function bucket() {
  getAdminFirestore();
  return getStorage(getApp('mongna-server-admin')).bucket('mongna-vod.firebasestorage.app');
}
export function sameOrigin(request: Request) {
  try { return new URL(request.headers.get('origin') || '').host === request.headers.get('host'); }
  catch { return false; }
}
export const validId = (value: string) => /^[a-f0-9]{32}$/.test(value);
export function validateCard(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('잘못된 방셀 데이터입니다.');
  const result: Record<string, any> = {};
  const text = (key: string, max: number) => {
    if (typeof input[key] !== 'string' || input[key].length > max) throw new Error(`${key}: 입력 길이를 확인해주세요.`);
    result[key] = input[key];
  };
  const choice = (key: string, values: string[]) => {
    if (!values.includes(input[key])) throw new Error(`${key}: 설정값을 확인해주세요.`);
    result[key] = input[key];
  };
  const number = (key: string, min: number, max: number) => {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw new Error(`${key}: 범위를 확인해주세요.`);
    result[key] = input[key];
  };
  const mediaUrl = (value: unknown) => {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('파일 주소가 올바르지 않습니다.');
    if (value === '') return value;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('업로드가 완료된 파일만 저장할 수 있습니다.');
    return value;
  };
  number('id', 0, Number.MAX_SAFE_INTEGER);
  for (const key of ['title', 'nickname', 'storySticker', 'dmName']) text(key, 200);
  text('message', 2000);
  for (const key of ['image', 'frontImage', 'backImage', 'dmProfile']) result[key] = mediaUrl(input[key]);
  choice('kind', ['scratch', 'story', 'photocard', 'dm']);
  choice('coating', ['silver', 'lavender', 'pink']);
  choice('scratchStyle', ['soft', 'precise', 'bold']);
  choice('revealStyle', ['fade', 'zoom', 'glow']);
  choice('template', ['classic', 'story', 'polaroid']);
  choice('storyTransition', ['fade', 'slide', 'zoom']);
  choice('cardEffect', ['hologram', 'sparkle', 'shine']);
  choice('cardSize', ['small', 'medium', 'large']);
  number('threshold', 30, 90); number('scale', 1, 2); number('x', 0, 100); number('y', 0, 100);
  for (const key of ['cardBorder', 'dmBubble', 'dmBackground']) {
    if (!/^#[a-f0-9]{6}$/i.test(input[key])) throw new Error('색상 형식을 확인해주세요.');
    result[key] = input[key];
  }
  if (!Array.isArray(input.storyScenes) || input.storyScenes.length > 20) throw new Error('장면은 최대 20개입니다.');
  result.storyScenes = input.storyScenes.map((scene: any) => {
    if (!scene || !Number.isSafeInteger(scene.id) || !['image', 'video'].includes(scene.mediaType) || !Number.isFinite(scene.duration) || scene.duration < 1 || scene.duration > 15) throw new Error('장면 설정을 확인해주세요.');
    return { id: scene.id, src: mediaUrl(scene.src), mediaType: scene.mediaType, duration: scene.duration };
  });
  if (!Array.isArray(input.dmMessages) || input.dmMessages.length > 50 || !input.dmMessages.every((s: unknown) => typeof s === 'string' && s.length <= 2000)) throw new Error('메시지는 50개, 각 2000자까지 가능합니다.');
  result.dmMessages = input.dmMessages;
  number('dmRevealAfter', 1, Math.max(1, input.dmMessages.length));
  return result;
}

type Upload = { uri: string; path: string; mime: string; size: number; downloadToken: string; expires: number };
function key() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('관리자 세션 설정이 필요합니다.');
  return value;
}
function signature(value: string) { return createHmac('sha256', key()).update('bangsel-upload:' + value).digest('base64url'); }
export function sealUpload(upload: Upload) {
  const payload = Buffer.from(JSON.stringify(upload)).toString('base64url');
  return payload + '.' + signature(payload);
}
export function openUpload(token: string): Upload {
  if (token.length > 8192) throw new Error('업로드 정보가 잘못되었습니다.');
  const [payload, signed, extra] = token.split('.');
  const expected = Buffer.from(signature(payload || '')), actual = Buffer.from(signed || '');
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('업로드 정보가 잘못되었습니다.');
  const upload: Upload = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (upload.expires < Date.now()) throw new Error('업로드 시간이 만료되었습니다. 다시 선택해주세요.');
  const url = new URL(upload.uri);
  if (url.protocol !== 'https:' || !['storage.googleapis.com', 'www.googleapis.com'].includes(url.hostname)) throw new Error('업로드 주소가 잘못되었습니다.');
  return upload;
}
export async function startUpload(mime: string, size: number) {
  if (!MEDIA_TYPES[mime] || !Number.isSafeInteger(size) || size < 1 || size > MEDIA_TYPES[mime] * 1024 * 1024) throw new Error('사진은 20MB, 영상은 100MB 이하의 지원 형식으로 선택해주세요.');
  const path = `bangsel/${randomUUID()}`, downloadToken = randomUUID();
  const [uri] = await bucket().file(path).createResumableUpload({ metadata: {
    contentType: mime, cacheControl: 'private, max-age=3600', metadata: { firebaseStorageDownloadTokens: downloadToken },
  } });
  return sealUpload({ uri, path, mime, size, downloadToken, expires: Date.now() + 60 * 60 * 1000 });
}
export function downloadUrl(upload: Upload) {
  return `https://firebasestorage.googleapis.com/v0/b/mongna-vod.firebasestorage.app/o/${encodeURIComponent(upload.path)}?alt=media&token=${upload.downloadToken}`;
}
