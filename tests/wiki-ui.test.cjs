const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://mongna.vercel.app/wiki' });
Object.assign(global, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true, alert: () => {} });
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
window.HTMLMediaElement.prototype.play = async () => {};
global.Audio = window.Audio;
const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const root = path.resolve(__dirname, '..'), cache = new Map();
let wiki, snapshot, authenticated, writes, failSave;
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file)); cache.set(file, mod);
  const native = mod.require.bind(mod);
  mod.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name.endsWith('/SiteNavigation')) return { MainNavLinks: () => null, UtilityNavLinks: () => null };
    if (name.endsWith('/lib/firebase')) return { db: {} };
    if (name === 'firebase/firestore') return { doc: () => ({}), onSnapshot: (_, cb) => {
      snapshot = cb; cb({ exists: () => true, data: () => ({ data: wiki }) }); return () => { snapshot = null; };
    } };
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(file), name);
      return load(path.relative(root, fs.existsSync(target) ? target : fs.existsSync(target + '.ts') ? target + '.ts' : target + '.tsx'));
    }
    return native(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  } }).outputText, file);
  return mod.exports;
}
const Wiki = load('src/app/wiki/page.tsx').default;
function setup(admin = true, chapters = []) {
  authenticated = admin; failSave = false; writes = []; localStorage.clear();
  wiki = { profile: { name: '몽나_', sections: [{ title: '소개', content: '기존 소개' }] },
    history: [{ id: 1, title: '기존 역사', date: '2026.10.01' }], chapters };
  global.fetch = async (url, init) => {
    if (url === '/api/auth/session') return Response.json({ authenticated });
    assert.equal(url, '/api/admin/calendar-data');
    const body = JSON.parse(init.body); writes.push(body);
    if (failSave) return Response.json({}, { status: 401 });
    assert.equal(init.credentials, 'same-origin');
    wiki = { ...wiki, ...body.data.data };
    snapshot?.({ exists: () => true, data: () => ({ data: wiki }) });
    return Response.json({ success: true });
  };
}
async function mount() {
  const node = document.getElementById('root'), r = createRoot(node);
  await act(async () => r.render(React.createElement(Wiki)));
  return { node, close: async () => act(async () => r.unmount()) };
}
function button(node, text) { return [...node.querySelectorAll('button')].find(item => item.textContent.trim() === text); }
async function click(node) { assert.ok(node); await act(async () => Simulate.click(node)); }
async function change(node, value) { await act(async () => { node.value = value; Simulate.change(node); }); }
async function submit(node) { await act(async () => Simulate.submit(node.querySelector('form'))); }

test('visitors read saved chapters but cannot enable editing with a local flag', async () => {
  setup(false, [{ id: 'chapter-first', title: '취향', content: '첫 줄\n<script>내용</script>' }]);
  localStorage.setItem('mongna_secure_admin_v2', 'true');
  const m = await mount(); try {
    assert.equal(button(m.node, '+ 목차 추가'), undefined);
    assert.equal(button(m.node, '↕ 목차 순서 편집'), undefined);
    await click(button(m.node, '3. 취향'));
    assert.ok(m.node.textContent.includes('첫 줄\n<script>내용</script>'));
    assert.equal(m.node.querySelector('script'), null);
    assert.equal(button(m.node, '✏️ 내용 편집'), undefined);
    assert.equal(writes.length, 0);
  } finally { await m.close(); }
});

function menuTitles(node) { return [...node.querySelectorAll('.sidebar-menu .menu-btn')].map(item => item.textContent.trim()); }
async function moveChapter(node, title, direction) {
  await click(node.querySelector(`dialog button[aria-label="${title} ${direction}로 이동"]`));
}

test('admin reorders built-in and custom chapters, preserving selected content and order after reload', async () => {
  setup(true, [{ id: 'chapter-one', title: '취향', content: '취향 내용' }, { id: 'chapter-two', title: '명언', content: '명언 내용' }]);
  const originalProfile = wiki.profile, originalHistory = wiki.history, originalChapters = wiki.chapters;
  const m = await mount(); try {
    await click(button(m.node, '3. 취향'));
    await click(button(m.node, '↕ 목차 순서 편집'));
    assert.ok(m.node.querySelector('dialog button[aria-label="몽나 백과사전 위로 이동"]').disabled);
    assert.ok(m.node.querySelector('dialog button[aria-label="명언 아래로 이동"]').disabled);
    await moveChapter(m.node, '몽나의 역사', '위');
    await moveChapter(m.node, '명언', '위');
    await moveChapter(m.node, '명언', '위');
    await moveChapter(m.node, '명언', '위');
    await submit(m.node.querySelector('dialog'));
    assert.deepEqual(menuTitles(m.node), ['1. 명언', '📅 2. 몽나의 역사', '📖 3. 몽나 백과사전', '4. 취향']);
    assert.ok(button(m.node, '4. 취향').className.includes('active'));
    assert.ok(m.node.textContent.includes('취향 내용'));
    assert.deepEqual(writes[0].data.data, { chapterOrder: ['chapter-two', 'history', 'wiki', 'chapter-one'] });
    assert.equal(wiki.profile, originalProfile); assert.equal(wiki.history, originalHistory); assert.equal(wiki.chapters, originalChapters);
  } finally { await m.close(); }
  const reloaded = await mount(); try {
    assert.deepEqual(menuTitles(reloaded.node), ['1. 명언', '📅 2. 몽나의 역사', '📖 3. 몽나 백과사전', '4. 취향']);
    await click(button(reloaded.node, '1. 명언')); assert.ok(reloaded.node.textContent.includes('명언 내용'));
  } finally { await reloaded.close(); }
});

test('order cancel and failed save keep published order; retry saves the draft', async () => {
  setup(); const m = await mount(); try {
    await click(button(m.node, '↕ 목차 순서 편집'));
    await moveChapter(m.node, '몽나의 역사', '위');
    await click(button(m.node.querySelector('dialog'), '취소'));
    assert.deepEqual(menuTitles(m.node), ['📖 1. 몽나 백과사전', '📅 2. 몽나의 역사']);
    assert.equal(writes.length, 0);
    await click(button(m.node, '↕ 목차 순서 편집'));
    await moveChapter(m.node, '몽나의 역사', '위');
    failSave = true; await submit(m.node.querySelector('dialog'));
    assert.ok(m.node.querySelector('dialog [role="alert"]').textContent.includes('관리자 로그인'));
    assert.deepEqual(menuTitles(m.node), ['📖 1. 몽나 백과사전', '📅 2. 몽나의 역사']);
    failSave = false; await submit(m.node.querySelector('dialog'));
    assert.deepEqual(menuTitles(m.node), ['📅 1. 몽나의 역사', '📖 2. 몽나 백과사전']);
  } finally { await m.close(); }
});

test('saved order ignores duplicate/deleted IDs, appends new chapters and renumbers after deletion', async () => {
  setup(true, [{ id: 'chapter-one', title: '취향', content: '내용' }]);
  wiki.chapterOrder = ['chapter-one', 'chapter-deleted', 'history', 'chapter-one', 'wiki'];
  const m = await mount(); try {
    assert.deepEqual(menuTitles(m.node), ['1. 취향', '📅 2. 몽나의 역사', '📖 3. 몽나 백과사전']);
    await click(button(m.node, '+ 목차 추가'));
    await change(m.node.querySelector('dialog input'), '새 목차');
    await submit(m.node.querySelector('dialog'));
    assert.deepEqual(menuTitles(m.node), ['1. 취향', '📅 2. 몽나의 역사', '📖 3. 몽나 백과사전', '4. 새 목차']);
    await click(button(m.node, '1. 취향'));
    await click(button(m.node, '✏️ 내용 편집'));
    window.confirm = () => true;
    await click(button(m.node.querySelector('dialog'), '목차 삭제'));
    assert.deepEqual(menuTitles(m.node), ['📅 1. 몽나의 역사', '📖 2. 몽나 백과사전', '3. 새 목차']);
  } finally { await m.close(); }
});

test('admin adds and reloads a chapter without replacing profile or history', async () => {
  setup(); const m = await mount(); const originalProfile = wiki.profile, originalHistory = wiki.history;
  try {
    await click(button(m.node, '+ 목차 추가'));
    const editor = m.node.querySelector('dialog'); assert.ok(editor.open);
    await change(editor.querySelector('input'), '  몽나의 취향  ');
    await change(editor.querySelector('textarea'), '좋아하는 것\n두 번째 줄');
    await submit(editor);
    assert.equal(m.node.querySelector('dialog'), null);
    assert.ok(button(m.node, '3. 몽나의 취향').className.includes('active'));
    assert.ok(m.node.textContent.includes('좋아하는 것\n두 번째 줄'));
    assert.equal(writes[0].documentId, 'wiki_data');
    assert.deepEqual(Object.keys(writes[0].data.data), ['chapters']);
    assert.equal(wiki.profile, originalProfile); assert.equal(wiki.history, originalHistory);
  } finally { await m.close(); }
  const reloaded = await mount(); try {
    await click(button(reloaded.node, '3. 몽나의 취향'));
    assert.ok(reloaded.node.textContent.includes('좋아하는 것\n두 번째 줄'));
  } finally { await reloaded.close(); }
});

test('cancel keeps the original content; failed save retains the draft for retry; delete returns to encyclopedia', async () => {
  setup(true, [{ id: 'chapter-one', title: '취향', content: '기존 내용' }]);
  const m = await mount(); try {
    await click(button(m.node, '3. 취향'));
    await click(button(m.node, '✏️ 내용 편집'));
    await change(m.node.querySelector('dialog textarea'), '취소할 내용');
    await click(button(m.node.querySelector('dialog'), '취소'));
    assert.ok(m.node.textContent.includes('기존 내용')); assert.equal(writes.length, 0);
    await click(button(m.node, '✏️ 내용 편집'));
    await change(m.node.querySelector('dialog input'), '새 제목');
    await change(m.node.querySelector('dialog textarea'), '수정한 내용');
    failSave = true; await submit(m.node.querySelector('dialog'));
    assert.equal(m.node.querySelector('dialog textarea').value, '수정한 내용');
    assert.ok(m.node.querySelector('[role="alert"]').textContent.includes('관리자 로그인'));
    assert.ok(button(m.node, '3. 취향'));
    failSave = false; await submit(m.node.querySelector('dialog'));
    assert.ok(button(m.node, '3. 새 제목'));
    await click(button(m.node, '✏️ 내용 편집'));
    window.confirm = () => false; const before = writes.length;
    await click(button(m.node.querySelector('dialog'), '목차 삭제')); assert.equal(writes.length, before);
    window.confirm = () => true;
    await click(button(m.node.querySelector('dialog'), '목차 삭제'));
    assert.equal(button(m.node, '3. 새 제목'), undefined);
    assert.ok(button(m.node, '📖 1. 몽나 백과사전').className.includes('active'));
    assert.ok(m.node.textContent.includes('기존 소개'));
    await click(button(m.node, '📅 2. 몽나의 역사'));
    assert.ok(m.node.textContent.includes('기존 역사'));
  } finally { await m.close(); }
});
