const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ts = require('typescript'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  vm.runInNewContext(source, { exports, Buffer, URL, Date, console, process: { env: {
    ADMIN_SESSION_SECRET: 'a-test-only-secret-at-least-32-characters', ADMIN_PASSWORD: 'test-password'
  } }, require(name) { assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name]; }, ...globals });
  return exports;
}
function setup() {
  const records = new Map();
  const collection = {
    doc(id) { return {
      async get() { return { exists: records.has(id), data: () => records.get(id) }; },
      async create(value) { assert.equal(records.has(id), false); records.set(id, value); },
      async update(value) { if (!records.has(id)) throw { code: 5 }; records.set(id, value); },
      async delete() { records.delete(id); }
    }; },
    orderBy(field, order) { assert.equal(field, 'updatedAt'); assert.equal(order, 'desc'); return this; },
    limit(n) { assert.equal(n, 200); return this; },
    async get() { return { docs: [...records].map(([id, value]) => ({ id, data: () => value })) }; }
  };
  const db = { getAdminFirestore: () => ({ collection(name) { assert.equal(name, 'mongna_bangsel_cards'); return collection; } }) };
  const auth = load('src/lib/server/admin-session.ts', { 'server-only': {}, 'node:crypto': crypto });
  const helper = load('src/lib/server/bangsel.ts', {
    'server-only': {}, 'node:crypto': crypto, 'firebase-admin/app': { getApp: () => ({}) },
    'firebase-admin/storage': { getStorage: () => ({ bucket: () => ({ file: () => ({
      createResumableUpload: async () => ['https://storage.googleapis.com/upload/storage/v1/b/test?upload_id=test']
    }) }) }) }, './admin-firestore': db
  });
  const uploadRequests = [];
  const route = load('src/app/api/bangsel/[...path]/route.ts', {
    'next/server': { NextResponse: Response }, 'node:crypto': crypto,
    '../../../../lib/server/admin-firestore': db, '../../../../lib/server/admin-session': auth,
    '../../../../lib/server/bangsel': helper
  }, { fetch: async (url, init) => { uploadRequests.push({ url, init }); return new Response('{}', { status: 200 }); } });
  let cookie = '';
  async function request(path, method = 'GET', data, options = {}) {
    const headers = { host: 'mongna.vercel.app', origin: 'https://mongna.vercel.app', cookie, ...options.headers };
    const body = data === undefined ? undefined : data instanceof Uint8Array ? data : JSON.stringify(data);
    const response = await route[method](new Request(`https://mongna.vercel.app/api/bangsel/${path}`, { method, headers, body }), { params: { path: path.split('/') } });
    if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  }
  return { request, helper, uploadRequests, records };
}
function card() {
  return { id: 1, kind: 'story', title: '방셀', nickname: '몽나', message: '', image: 'https://example.com/photo.jpg',
    coating: 'lavender', scratchStyle: 'soft', revealStyle: 'fade', threshold: 60, template: 'classic', scale: 1, x: 50, y: 50,
    storyScenes: [{ id: 1, src: 'https://example.com/photo.jpg', mediaType: 'image', duration: 4 }], storyTransition: 'fade', storySticker: '',
    frontImage: '', backImage: '', cardEffect: 'hologram', cardSize: 'medium', cardBorder: '#ffffff', dmName: '몽나', dmProfile: '',
    dmMessages: ['안녕'], dmRevealAfter: 1, dmBubble: '#ffffff', dmBackground: '#ffffff' };
}
test('authenticated create/list/update, anonymous token view, and deletion invalidate shared links', async () => {
  const e = setup();
  assert.equal((await e.request('cards')).status, 401);
  assert.equal((await e.request('cards', 'POST', card())).status, 401);
  assert.equal((await e.request('session', 'POST', { password: 'bad' })).status, 401);
  assert.equal((await e.request('session', 'POST', { password: 'test-password' })).status, 200);
  assert.equal((await e.request('cards', 'POST', card(), { headers: { origin: 'https://evil.example' } })).status, 403);
  const created = await e.request('cards', 'POST', card()); assert.equal(created.status, 201);
  const { card: stored } = await created.json(); assert.match(stored.serverId, /^[a-f0-9]{32}$/);
  assert.equal((await (await e.request('cards')).json()).cards.length, 1);
  assert.equal((await e.request(`cards/${stored.serverId}`, 'PUT', { ...card(), title: '수정' })).status, 200);
  await e.request('session', 'DELETE');
  const viewed = await e.request(`view/${stored.serverId}`);
  assert.equal(viewed.headers.get('cache-control'), 'no-store');
  assert.equal((await viewed.json()).card.title, '수정');
  assert.equal((await e.request('view/' + '0'.repeat(32))).status, 404);
  assert.equal((await e.request(`cards/${stored.serverId}`, 'DELETE')).status, 401);
  await e.request('session', 'POST', { password: 'test-password' });
  await e.request(`cards/${stored.serverId}`, 'DELETE');
  assert.equal((await e.request(`view/${stored.serverId}`)).status, 404);
  assert.equal((await e.request(`cards/${stored.serverId}`, 'PUT', card())).status, 404);
});
test('validation rejects temporary files, unsafe URLs, invalid scene timing and arbitrary fields', () => {
  const e = setup();
  for (const url of ['blob:https://site/temporary', 'javascript:alert(1)', 'data:image/png;base64,abc']) {
    assert.throws(() => e.helper.validateCard({ ...card(), image: url }));
  }
  assert.throws(() => e.helper.validateCard({ ...card(), storyScenes: [{ id: 1, src: 'https://example.com/a', mediaType: 'image', duration: 0 }] }));
  assert.throws(() => e.helper.validateCard({ ...card(), threshold: NaN }));
  assert.equal(e.helper.validateCard({ ...card(), owner: 'attacker' }).owner, undefined);
});
test('uploads require authentication, validate MIME/size and reject tampered or expired upload state', async () => {
  const e = setup();
  assert.equal((await e.request('media', 'POST', { mime: 'image/png', size: 3 })).status, 401);
  await e.request('session', 'POST', { password: 'test-password' });
  assert.equal((await e.request('media', 'POST', { mime: 'image/svg+xml', size: 3 })).status, 400);
  assert.equal((await e.request('media', 'POST', { mime: 'video/mp4', size: 101 * 1024 * 1024 })).status, 400);
  const { upload } = await (await e.request('media', 'POST', { mime: 'image/png', size: 3 })).json();
  const done = await e.request('media', 'PUT', new Uint8Array([1, 2, 3]), { headers: { 'x-upload-token': upload, 'x-upload-offset': '0' } });
  assert.equal(done.status, 200); assert.equal((await done.json()).complete, true);
  assert.equal(e.uploadRequests[0].init.headers['Content-Range'], 'bytes 0-2/3');
  assert.equal((await e.request('media', 'PUT', new Uint8Array([1]), { headers: { 'x-upload-token': upload + 'x', 'x-upload-offset': '0' } })).status, 400);
  const info = e.helper.openUpload(upload); info.expires = Date.now() - 1;
  assert.throws(() => e.helper.openUpload(e.helper.sealUpload(info)));
});
