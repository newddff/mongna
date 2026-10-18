const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file)); cache.set(file, mod);
  const native = mod.require.bind(mod);
  mod.require = name => name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(file), name + '.ts'))) : native(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}
const { parseSoopDate, normalizeVideo, rankVideos, WEEK_MS } = load('src/lib/video-ranking.ts');
const { collectRanking, getWeeklyRanking } = load('src/lib/server/weekly-video-ranking.ts');
const { CALENDAR_CATEGORIES, CALENDAR_CATEGORY_COLORS } = load('src/lib/calendar-categories.ts');
const end = Date.parse('2026-10-18T10:00:00Z'), start = end - WEEK_MS;
const row = (id, type = 'CLIP', views = 10, date = '2026-10-18 18:00:00') => ({ title_no: id, title_name: '영상 ' + id, reg_date: date, user_nick: '팬 제작자', badge: { bj_id: 'pinktape8' }, ucc: { file_type: type, thumb: '//iflv14.sooplive.com/clip/thumb.jpg' }, count: { vod_read_cnt: views, read_cnt: 9999 } });
const response = (rows, last = 1) => new Response(JSON.stringify({ data: rows, meta: { last_page: last } }), { status: 200 });
test('SOOP dates are interpreted in Korean time and invalid dates fail closed', () => {
  assert.equal(parseSoopDate('2026-10-18 19:00:00'), end);
  for (const input of [null, '', 'yesterday', '2026-02-30 10:00:00', '2026-10-18 25:00:00']) assert.equal(parseSoopDate(input), null);
});
test('rolling seven-day boundaries include endpoints and reject unknown, old and future dates', () => {
  for (const date of ['2026-10-11 19:00:00', '2026-10-18 19:00:00']) assert.ok(normalizeVideo(row(1, 'CLIP', 0, date), 'clip', start, end));
  for (const date of ['2026-10-11 18:59:59', '2026-10-18 19:00:01', '']) assert.equal(normalizeVideo(row(1, 'CLIP', 10, date), 'clip', start, end), null);
});
test('explicit file_type prevents replays and wrong-category videos from entering rankings', () => {
  for (const type of ['REVIEW', 'NORMAL', '', 'CATCH']) assert.equal(normalizeVideo(row(1, type), 'clip', start, end), null);
  const missing = row(1); delete missing.ucc.file_type; assert.equal(normalizeVideo(missing, 'clip', start, end), null);
  assert.equal(normalizeVideo(row(1, 'CLIP'), 'catch', start, end), null);
});
test('uses actual video views including zero instead of larger board reads', () => {
  assert.equal(normalizeVideo(row(1, 'CLIP', 0), 'clip', start, end).views, 0);
  assert.equal(normalizeVideo(row(1, 'CLIP', '1,234'), 'clip', start, end).views, 1234);
  const value = row(1); delete value.count.vod_read_cnt;
  assert.equal(normalizeVideo(value, 'clip', start, end).views, 9999);
  value.count.read_cnt = 'invalid'; assert.equal(normalizeVideo(value, 'clip', start, end), null);
});
test('creator accounts are allowed but other-channel associations and deleted rows are excluded', () => {
  const value = row(1); value.user_id = 'fan'; assert.ok(normalizeVideo(value, 'clip', start, end));
  for (const bj_id of ['someone_else', 42]) assert.equal(normalizeVideo({ ...value, badge: { bj_id } }, 'clip', start, end), null);
  assert.equal(normalizeVideo({ ...value, copyright: { del_flag: 'Y' } }, 'clip', start, end), null);
});
test('safe player links use title_no and catch path, never board identifiers or supplied URLs', () => {
  const value = { ...row(123, 'CATCH'), bbs_no: 999, url: 'javascript:alert(1)' };
  assert.equal(normalizeVideo(value, 'catch', start, end).url, 'https://vod.sooplive.com/player/123/catch');
  assert.equal(normalizeVideo({ ...value, title_no: 'bad' }, 'catch', start, end), null);
  assert.equal(normalizeVideo({ ...value, ucc: { ...value.ucc, thumb: 'https://evil.example/a.jpg' } }, 'catch', start, end).thumb, '');
});
test('deduplicates before selecting five highest views, with newest first on ties', () => {
  const rows = [row(1, 'CLIP', 1), row(1, 'CLIP', 20), row(2, 'CLIP', 20, '2026-10-17 12:00:00'), ...[3,4,5,6,7].map(id => row(id, 'CLIP', id))];
  assert.deepEqual(rankVideos(rows, 'clip', start, end).map(x => x.id), ['1','2','7','6','5']);
});
test('collector uses verified typed endpoints, date filters, and includes later-page winners', async () => {
  const urls = [];
  const result = await collectRanking('clip', start, end, async url => { urls.push(new URL(url)); return response([row(urls.length, 'CLIP', urls.length * 100)], 2); });
  assert.equal(result.status, 'ready'); assert.deepEqual(result.items.map(x => x.id), ['2', '1']);
  assert.equal(urls[0].pathname, '/api/pinktape8/vods/clip/all');
  assert.equal(urls[0].searchParams.get('start_date'), '2026-10-11'); assert.equal(urls[0].searchParams.get('orderby'), 'reg_date');
  assert.equal(urls[1].searchParams.get('page'), '2');
});
test('unexpected replay response is an error, while a valid empty list is empty', async () => {
  assert.equal((await collectRanking('catch', start, end, async () => response([row(1, 'REVIEW')]))).status, 'error');
  assert.deepEqual(await collectRanking('catch', start, end, async () => response([])), { status: 'ready', items: [] });
});
test('upstream and malformed-response errors are not reported as no videos', async () => {
  for (const fetcher of [async () => new Response('', { status: 503 }), async () => new Response('bad json'), async () => new Response('{}'), async () => { throw new Error('timeout'); }]) {
    assert.deepEqual(await collectRanking('clip', start, end, fetcher), { status: 'error', items: [] });
  }
});
test('transient upstream errors retry once within the collection budget', async () => {
  let calls = 0;
  const result = await collectRanking('clip', start, end, async () => { if (++calls === 1) throw new Error('temporary disconnect'); return response([row(1)]); });
  assert.equal(calls, 2); assert.equal(result.status, 'ready');
});
test('later-page failure preserves results but marks ranking incomplete', async () => {
  let calls = 0;
  const result = await collectRanking('clip', start, end, async () => { if (++calls >= 2) throw new Error('down'); return response([row(1)], 3); });
  assert.equal(result.status, 'partial'); assert.equal(result.items.length, 1);
});
test('repeated pages and pagination limit cannot masquerade as complete rankings', async () => {
  const repeated = await collectRanking('clip', start, end, async () => response([row(1)], 100)); assert.equal(repeated.status, 'partial');
  let calls = 0;
  const capped = await collectRanking('clip', start, end, async () => response([row(++calls)], 100));
  assert.equal(calls, 10); assert.equal(capped.status, 'partial');
});
test('concurrent homepage requests share one collection and the cached period', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async url => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return response([row(1, url.includes('/catch/') ? 'CATCH' : 'CLIP')]); };
  try {
    const [a,b] = await Promise.all([getWeeklyRanking(), getWeeklyRanking()]);
    assert.equal(a, b); assert.equal(calls, 2); assert.equal(await getWeeklyRanking(), a); assert.equal(calls, 2);
  } finally { global.fetch = original; }
});
test('구플 is a shared calendar category and survives merging legacy saved colors', () => {
  const colors = { ...CALENDAR_CATEGORY_COLORS, 방송: '#111111' };
  assert.ok(CALENDAR_CATEGORIES.includes('구플')); assert.equal(colors.구플, '#ec4899'); assert.equal(colors.방송, '#111111');
});
