const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'public/admin-session.js'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function environment() {
  let cookie = false;
  const windows = [], values = new Map(), requests = [];
  async function server(url, init = {}) {
    requests.push({ url, ...init });
    assert.equal(init.credentials, 'same-origin');
    if (url === '/api/auth' && init.method === 'POST') {
      if (JSON.parse(init.body).password !== 'test-password') return Response.json({}, { status: 401 });
      cookie = true; return Response.json({ success: true });
    }
    assert.equal(url, '/api/auth/session');
    if (init.method === 'DELETE') { cookie = false; return Response.json({ success: true }); }
    assert.equal(init.cache, 'no-store');
    return Response.json({ authenticated: cookie });
  }
  function create(html = '<body></body>', fetcher = server) {
    const dom = new JSDOM(html, { url: 'https://mongna.vercel.app/', runScripts: 'outside-only' });
    const win = dom.window; windows.push(win);
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem(key, value) {
        const oldValue = values.get(key) ?? null;
        values.set(key, value);
        for (const other of windows) if (other !== win && oldValue !== value) {
          other.dispatchEvent(new other.StorageEvent('storage', { key, oldValue, newValue: value }));
        }
      },
      removeItem(key) {
        const oldValue = values.get(key) ?? null; values.delete(key);
        if (oldValue !== null) for (const other of windows) if (other !== win) {
          other.dispatchEvent(new other.StorageEvent('storage', { key, oldValue, newValue: null }));
        }
      }
    };
    Object.defineProperty(win, 'localStorage', { value: storage });
    const exports = {};
    vm.runInNewContext(source, { exports, window: win, document: win.document, fetch: fetcher });
    return { session: exports, win };
  }
  return { create, server, requests, values, expire: () => { cookie = false; }, close: () => windows.forEach(win => win.close()) };
}

test('one verified login and logout synchronizes subscribers and separate tabs without storing credentials', async () => {
  const env = environment(), a = env.create(), b = env.create();
  const aStates = [], bStates = [];
  const offA = a.session.subscribeAdminSession(value => aStates.push(value));
  const offB = b.session.subscribeAdminSession(value => bStates.push(value));
  try {
    await Promise.all([a.session.refreshAdminSession(), b.session.refreshAdminSession()]);
    assert.equal(aStates.at(-1), false); assert.equal(bStates.at(-1), false);
    await a.session.loginAdmin('test-password'); await b.session.refreshAdminSession();
    assert.equal(aStates.at(-1), true); assert.equal(bStates.at(-1), true);
    assert.deepEqual([...env.values.keys()], ['mongna_admin_session_sync']);
    assert.ok(![...env.values.values()].join('').includes('test-password'));
    await b.session.logoutAdmin(); await a.session.refreshAdminSession();
    assert.equal(aStates.at(-1), false); assert.equal(bStates.at(-1), false);
    assert.equal(env.requests.filter(request => request.url === '/api/auth').length, 1);
    assert.equal(env.requests.filter(request => request.method === 'DELETE').length, 1);
  } finally { offA(); offB(); env.close(); }
});

test('forged storage flags cannot enable editing; focus refresh detects an expired cookie', async () => {
  const env = environment(), a = env.create(); const states = [];
  env.values.set('mongna_secure_admin_v2', 'true');
  const off = a.session.subscribeAdminSession(value => states.push(value));
  try {
    await a.session.refreshAdminSession(); assert.equal(states.at(-1), false);
    a.win.dispatchEvent(new a.win.StorageEvent('storage', { key: 'mongna_admin_session_sync', newValue: 'true' }));
    await a.session.refreshAdminSession(); assert.equal(states.at(-1), false);
    await a.session.loginAdmin('test-password'); assert.equal(states.at(-1), true);
    env.expire(); a.win.dispatchEvent(new a.win.Event('focus'));
    await a.session.refreshAdminSession(); assert.equal(states.at(-1), false);
  } finally { off(); env.close(); }
});

test('a delayed session response cannot restore admin mode after logout', async () => {
  const env = environment(); let release;
  const a = env.create(undefined, async (url, init) => {
    if (!init.method) return new Promise(resolve => { release = resolve; });
    return env.server(url, init);
  });
  const states = [], off = a.session.subscribeAdminSession(value => states.push(value));
  try {
    const oldRequest = a.session.refreshAdminSession(); await Promise.resolve();
    await a.session.logoutAdmin();
    release(Response.json({ authenticated: true })); await oldRequest;
    assert.equal(states.at(-1), false);
  } finally { off(); env.close(); }
});

test('login requires an actual server session and failed logout preserves a valid session', async () => {
  const env = environment();
  const missingCookie = env.create(undefined, async () => Response.json({ success: true, authenticated: false }));
  const states = [], off = missingCookie.session.subscribeAdminSession(value => states.push(value));
  try {
    await assert.rejects(missingCookie.session.loginAdmin('test-password'), /세션을 확인하지 못했습니다/);
    assert.equal(states.at(-1), false); assert.equal(env.values.size, 0);
  } finally { off(); }
  const a = env.create(undefined, async (url, init) => init.method === 'DELETE'
    ? Response.json({}, { status: 503 }) : env.server(url, init));
  const active = [], stop = a.session.subscribeAdminSession(value => active.push(value));
  try {
    await a.session.loginAdmin('test-password');
    await assert.rejects(a.session.logoutAdmin(), /로그아웃하지 못했습니다/);
    assert.equal(active.at(-1), true);
  } finally { stop(); env.close(); }
});

test('temporary check failures preserve verified UI, while confirmed expiry and rejection revoke it', async () => {
  const env = environment(); let failure;
  const a = env.create(undefined, (url, init) => !init.method && failure ? failure() : env.server(url, init));
  const states = [], off = a.session.subscribeAdminSession(value => states.push(value));
  try {
    await a.session.loginAdmin('test-password');
    for (const fail of [
      () => Promise.reject(new Error('offline')),
      () => Response.json({}, { status: 503 }),
      () => new Response('<html>gateway error</html>'),
      () => Response.json({}),
      () => Response.json({ authenticated: 'false' })
    ]) {
      failure = fail;
      a.win.dispatchEvent(new a.win.Event('focus'));
      assert.equal(await a.session.refreshAdminSession(), false);
      assert.equal(states.at(-1), true);
    }
    assert.deepEqual(states, [false, true]);
    failure = undefined;
    assert.equal(await a.session.refreshAdminSession(true), true);
    env.expire();
    await a.session.refreshAdminSession(true);
    assert.equal(states.at(-1), false);
    for (const status of [401, 403]) {
      await a.session.loginAdmin('test-password');
      failure = () => Response.json({}, { status });
      await a.session.refreshAdminSession(true);
      assert.equal(states.at(-1), false);
      failure = undefined;
    }
  } finally { off(); env.close(); }
});

test('failed checks never grant initial access or count as successful login verification', async () => {
  const env = environment(); let unavailable = true;
  const a = env.create(undefined, (url, init) => !init.method && unavailable
    ? Response.json({}, { status: 503 }) : env.server(url, init));
  const states = [], off = a.session.subscribeAdminSession(value => states.push(value));
  try {
    await a.session.refreshAdminSession();
    assert.equal(states.at(-1), false);
    await assert.rejects(a.session.loginAdmin('test-password'), /세션을 확인하지 못했습니다/);
    assert.equal(states.at(-1), false);
    unavailable = false;
    await a.session.loginAdmin('test-password');
    unavailable = true;
    await assert.rejects(a.session.loginAdmin('test-password'), /세션을 확인하지 못했습니다/);
    assert.equal(states.at(-1), true);
  } finally { off(); env.close(); }
});

test('real song and reward page adapters share login and logout through the common client', async () => {
  const env = environment();
  function page(name) {
    const html = fs.readFileSync(path.join(root, `public/${name}.html`), 'utf8');
    const client = env.create(html);
    client.win.__session = client.session;
    client.win.prompt = () => 'test-password'; client.win.confirm = () => true; client.win.alert = () => {};
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;\s*$/gm, '');
    client.win.eval(`const {subscribeAdminSession, loginAdmin, logoutAdmin, invalidateAdminSession} = window.__session;
      const initializeApp=()=>({}), getFirestore=()=>({}), doc=()=>({}), onSnapshot=()=>()=>{};\n${script}`);
    return client;
  }
  const song = page('song'), reward = page('reward');
  try {
    await Promise.all([song.session.refreshAdminSession(), reward.session.refreshAdminSession()]);
    await song.win.toggleAdmin(); await reward.session.refreshAdminSession();
    assert.ok(song.win.document.getElementById('adminBtn').classList.contains('on'));
    assert.ok(reward.win.document.getElementById('adminToggleBtn').classList.contains('on'));
    assert.equal(song.win.document.getElementById('adminPanel').style.display, 'block');
    await reward.win.toggleAdmin(); await song.session.refreshAdminSession();
    assert.ok(!song.win.document.getElementById('adminBtn').classList.contains('on'));
    assert.ok(!reward.win.document.getElementById('adminToggleBtn').classList.contains('on'));
    assert.equal(song.win.document.getElementById('adminPanel').style.display, 'none');
  } finally { env.close(); }
});
