const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), ts = require('typescript');
const root = path.resolve(__dirname, '..');

function environment() {
  let now = 1800000000000;
  const env = { ADMIN_SESSION_SECRET: 'test-only-session-secret-with-32-characters' };
  class Clock extends Date { static now() { return now; } }
  function load(file, dependencies) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    vm.runInNewContext(source, { exports, Buffer, Date: Clock, process: { env }, require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name];
    } });
    return exports;
  }
  const session = load('src/lib/server/admin-session.ts', { 'server-only': {}, 'node:crypto': crypto });
  const route = load('src/app/api/auth/session/route.ts', {
    'next/server': { NextResponse: Response }, '../../../../lib/server/admin-session': session
  });
  const request = cookie => new Request('https://mongna.vercel.app/api/auth/session', {
    headers: { cookie: cookie?.split(';')[0] || '' }
  });
  function legacy(age) {
    const payload = `v1.${Math.floor(now / 1000) - age}.test-nonce`;
    const signature = crypto.createHmac('sha256', env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
    return `mongna_admin_session=${payload}.${signature}`;
  }
  return { session, route, request, legacy, env, advance: seconds => { now += seconds * 1000; } };
}

test('persistent login survives 12 hours and renews with use beyond the original lifetime', async () => {
  const e = environment();
  const original = e.session.createAdminSessionCookie();
  assert.match(original, /mongna_admin_session=v2\./);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=34560000']) assert.ok(original.includes(flag));
  e.advance(13 * 3600);
  assert.equal(e.session.isAdminSession(e.request(original)), true);
  assert.equal((await e.route.GET(e.request(original))).headers.get('set-cookie'), null);
  e.advance(12 * 3600);
  const renewed = await e.route.GET(e.request(original));
  assert.equal((await renewed.json()).authenticated, true);
  assert.equal(renewed.headers.get('cache-control'), 'no-store');
  const cookie = renewed.headers.get('set-cookie');
  assert.ok(cookie); assert.notEqual(cookie, original);
  e.advance(399 * 86400);
  assert.equal(e.session.isAdminSession(e.request(original)), false);
  assert.equal(e.session.isAdminSession(e.request(cookie)), true);
});

test('only valid legacy sessions upgrade; missing, expired and tampered sessions cannot renew', async () => {
  const e = environment();
  const valid = await e.route.GET(e.request(e.legacy(3600)));
  assert.equal((await valid.json()).authenticated, true);
  assert.match(valid.headers.get('set-cookie'), /mongna_admin_session=v2\./);
  const original = e.session.createAdminSessionCookie();
  const tampered = original.replace('v2.', 'v1.');
  for (const cookie of [null, e.legacy(12 * 3600), tampered]) {
    const response = await e.route.GET(e.request(cookie));
    assert.equal((await response.json()).authenticated, false);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  e.advance(400 * 86400);
  const expired = await e.route.GET(e.request(original));
  assert.equal((await expired.json()).authenticated, false);
  assert.equal(expired.headers.get('set-cookie'), null);
});

test('logout expires the cookie and rotating the secret invalidates existing sessions', async () => {
  const e = environment(), cookie = e.session.createAdminSessionCookie();
  const logout = await e.route.DELETE();
  assert.match(logout.headers.get('set-cookie'), /mongna_admin_session=;.*Max-Age=0/);
  assert.equal(e.session.isAdminSession(e.request(logout.headers.get('set-cookie'))), false);
  e.env.ADMIN_SESSION_SECRET = 'replacement-test-only-secret-with-32-characters';
  assert.equal(e.session.isAdminSession(e.request(cookie)), false);
});
