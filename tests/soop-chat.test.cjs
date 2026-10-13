const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const loaded = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (loaded.has(filename)) return loaded.get(filename).exports;
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.set(filename, mod);
  const nativeRequire = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'server-only') return {};
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), name);
      if (fs.existsSync(target + '.ts')) return load(path.relative(root, target + '.ts'));
    }
    return nativeRequire(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText, filename);
  return mod.exports;
}
const auth = load('src/lib/server/soop-chat-auth.ts');
const callback = load('src/app/api/soop/chat/callback/route.ts');
const sessionRoute = load('src/app/api/soop/chat/session/route.ts');
const start = load('src/app/api/soop/chat/start/route.ts');
const vote = load('src/lib/chat-vote.ts');
const originalFetch = global.fetch;
let originalEnv;
beforeEach(() => {
  originalEnv = { ...process.env };
  Object.assign(process.env, { SOOP_CLIENT_ID: 'test-client', SOOP_CLIENT_SECRET: 'test-secret',
    SOOP_CHAT_SESSION_SECRET: 'test-random-secret-at-least-32-characters',
    SOOP_CHAT_REDIRECT_URL: 'https://mongna.vercel.app/streamer/soop-callback', NODE_ENV: 'production' });
  delete process.env.SOOP_CHAT_TEST_STREAMER_ID; delete process.env.VERCEL_ENV;
});
afterEach(() => { global.fetch = originalFetch; process.env = originalEnv; });
function req(url, body, cookies = '', origin = 'https://mongna.vercel.app') {
  return new Request('https://mongna.vercel.app' + url, { method: 'POST',
    headers: { origin, cookie: cookies, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
function activeSession() {
  return { streamerId: 'pinktape8', accessToken: 'access-secret', refreshToken: 'refresh-secret',
    accessExpiresAt: Date.now() + 3600000, sessionExpiresAt: Date.now() + 86400000 };
}
function mockSoop(roomId = 'pinktape8', live = true) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, params: new URLSearchParams(options.body) });
    return Response.json(url.endsWith('/auth/token')
      ? { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }
      : { result: live ? 1 : -1, data: live ? [{ id: roomId }] : [] });
  };
  return calls;
}
test('encrypted cookies reject tampering and cross-purpose use', () => {
  const value = auth.seal(activeSession(), 'session');
  assert.equal(auth.unseal(value, 'session').streamerId, 'pinktape8');
  assert.equal(auth.unseal(value, 'flow'), null);
  const parts = value.split('.'); parts[1] = Buffer.alloc(16).toString('base64url');
  assert.equal(auth.unseal(parts.join('.'), 'session'), null);
  assert.ok(!value.includes('refresh-secret'));
});
test('production ignores any test-account override; Preview permits it', () => {
  process.env.SOOP_CHAT_TEST_STREAMER_ID = 'mytest';
  assert.equal(auth.chatConfig().streamerId, 'pinktape8');
  process.env.VERCEL_ENV = 'preview';
  assert.equal(auth.chatConfig().streamerId, 'mytest');
});
test('start rejects cross-origin requests', async () => {
  const result = await start.POST(req('/api/soop/chat/start', {}, '', 'https://evil.example'));
  assert.equal(result.status, 403);
});
test('start supplies documented chat scope and an HttpOnly flow cookie', async () => {
  const result = await start.POST(req('/api/soop/chat/start', {}));
  const data = await result.json();
  assert.equal(new URL(data.authUrl).searchParams.get('scope'), 'broad_access_chatinfo');
  assert.equal(data.nonce.length, 43);
  assert.match(result.headers.get('set-cookie'), /HttpOnly/);
  assert.match(result.headers.get('set-cookie'), /Secure/);
});
test('callback rejects a code injected without a matching per-tab nonce', async () => {
  const { pending } = auth.startFlow(); let called = false;
  global.fetch = async () => { called = true; throw Error(); };
  const result = await callback.POST(req('/api/soop/chat/callback', { code: 'x', nonce: 'wrong' },
    auth.FLOW_COOKIE + '=' + auth.seal(pending, 'flow')));
  assert.equal(result.status, 403); assert.equal(called, false);
});
test('expired flow is rejected before token exchange', () => {
  const pending = { nonce: 'same', expiresAt: Date.now() - 1 };
  assert.throws(() => auth.verifyFlow(req('/x', {}, auth.FLOW_COOKIE + '=' + auth.seal(pending, 'flow')), 'same'), /만료/);
});
test('another account cannot create or replace the authorized host session', async () => {
  mockSoop('someone-else');
  const { pending } = auth.startFlow();
  const result = await callback.POST(req('/api/soop/chat/callback', { code: 'valid-code', nonce: pending.nonce },
    auth.FLOW_COOKIE + '=' + auth.seal(pending, 'flow') + '; ' + auth.SESSION_COOKIE + '=' + auth.seal(activeSession(), 'session')));
  assert.equal(result.status, 403);
  assert.equal((await result.json()).kind, 'wrong_account');
  assert.ok(!result.headers.get('set-cookie').includes(auth.SESSION_COOKIE + '='));
});
test('initial authorization fails closed when no room identity is available', async () => {
  mockSoop('pinktape8', false);
  const { pending } = auth.startFlow();
  const result = await callback.POST(req('/api/soop/chat/callback', { code: 'valid-code', nonce: pending.nonce },
    auth.FLOW_COOKIE + '=' + auth.seal(pending, 'flow')));
  assert.equal(result.status, 409);
  assert.ok(!result.headers.get('set-cookie').includes(auth.SESSION_COOKIE + '='));
});
test('verified host receives an encrypted session, never tokens in the callback body', async () => {
  const calls = mockSoop(); const { pending } = auth.startFlow();
  const result = await callback.POST(req('/api/soop/chat/callback', { code: 'valid-code', nonce: pending.nonce },
    auth.FLOW_COOKIE + '=' + auth.seal(pending, 'flow')));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { authenticated: true });
  assert.match(result.headers.get('set-cookie'), /mongna_soop_chat=/);
  assert.ok(!result.headers.get('set-cookie').includes('new-access'));
  assert.equal(calls[0].params.get('client_secret'), 'test-secret');
});
test('no session cannot retrieve an access token', async () => {
  const result = await sessionRoute.POST(req('/api/soop/chat/session', {}));
  assert.deepEqual(await result.json(), { authenticated: false });
});
test('live host receives only access token; offline host receives no token', async () => {
  const session = activeSession(); const cookies = auth.SESSION_COOKIE + '=' + auth.seal(session, 'session');
  mockSoop();
  let result = await sessionRoute.POST(req('/api/soop/chat/session', {}, cookies));
  let data = await result.json();
  assert.equal(data.accessToken, 'access-secret'); assert.ok(!('refreshToken' in data));
  mockSoop('pinktape8', false);
  result = await sessionRoute.POST(req('/api/soop/chat/session', {}, cookies)); data = await result.json();
  assert.equal(data.authenticated, true); assert.equal(data.live, false); assert.ok(!('accessToken' in data));
});
test('expired access token refreshes automatically and updates encrypted cookie', async () => {
  const session = { ...activeSession(), accessExpiresAt: 1 };
  const calls = mockSoop();
  const result = await sessionRoute.POST(req('/api/soop/chat/session', {}, auth.SESSION_COOKIE + '=' + auth.seal(session, 'session')));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).accessToken, 'new-access');
  assert.equal(calls[0].params.get('grant_type'), 'refresh_token');
  assert.match(result.headers.get('set-cookie'), /mongna_soop_chat=/);
});
test('upstream failure does not delete an existing authorized session', async () => {
  global.fetch = async () => { throw Error('network'); };
  const result = await sessionRoute.POST(req('/api/soop/chat/session', {}, auth.SESSION_COOKIE + '=' + auth.seal(activeSession(), 'session')));
  assert.equal(result.status, 502); assert.equal(result.headers.get('set-cookie'), null);
});
test('votes accept exact 1-7 and reject partial numbers', () => {
  assert.equal(vote.parseChatVote(' 3 '), 3);
  for (const value of ['0', '8', '17', '1번', '7abc', '-1', '1.0', '']) assert.equal(vote.parseChatVote(value), null);
});

test('configuration names missing variables without disclosing secret values', () => {
  delete process.env.SOOP_CLIENT_SECRET;
  delete process.env.SOOP_CHAT_REDIRECT_URL;
  assert.throws(() => auth.chatConfig(), error => {
    assert.equal(error.kind, 'configuration');
    assert.match(error.message, /SOOP_CLIENT_SECRET/);
    assert.match(error.message, /SOOP_CHAT_REDIRECT_URL/);
    assert.ok(!error.message.includes('test-client'));
    assert.ok(!error.message.includes(process.env.SOOP_CHAT_SESSION_SECRET));
    return true;
  });
});
test('configuration rejects a short session key and trims pasted whitespace', () => {
  process.env.SOOP_CHAT_SESSION_SECRET = 'short';
  assert.throws(() => auth.chatConfig(), /SOOP_CHAT_SESSION_SECRET.*32자/);
  process.env.SOOP_CHAT_SESSION_SECRET = 'test-random-secret-at-least-32-characters';
  process.env.SOOP_CLIENT_ID = ' test-client \n';
  process.env.SOOP_CHAT_REDIRECT_URL = ' https://mongna.vercel.app/streamer/soop-callback \n';
  assert.equal(auth.chatConfig().clientId, 'test-client');
  assert.equal(auth.chatConfig().origin, 'https://mongna.vercel.app');
});
