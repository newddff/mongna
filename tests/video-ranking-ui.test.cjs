const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM('<div id="root"></div>',{url:'https://mongna.vercel.app/calendar'});
global.window=dom.window;global.self=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.localStorage=dom.window.localStorage;global.IS_REACT_ACT_ENVIRONMENT=true;global.alert=()=>{};
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const cache=new Map();
function load(relative){
 const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file).exports;
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);const native=mod.require.bind(mod);
 mod.require=name=>{
  if(name.endsWith('.css'))return{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(name==='next/navigation')return{usePathname:()=>'/calendar'};
  if(name==='firebase/app')return{initializeApp:()=>({})};
  if(name==='firebase/firestore')return{getFirestore:()=>({}),doc:(_,collection,id)=>({id}),onSnapshot:(ref,cb)=>{cb({exists:()=>ref.id==='category_colors',data:()=>({방송:'#123456'})});return()=>{};}};
  if(name.startsWith('.')){const target=path.resolve(path.dirname(file),name);return load(path.relative(root,fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx'));}
  return native(name);
 };mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return mod.exports;
}
const Ranking=load('src/components/weekly-ranking/WeeklyVideoRanking.tsx').default;
const Calendar=load('src/app/calendar/page.tsx').default;
const fixture={period:{from:'2026-10-11T10:00:00Z',to:'2026-10-18T10:00:00Z'},rankings:{clip:{status:'ready',items:[{id:'1',title:'팬이 만든 클립',creator:'달구',publishedAt:'2026-10-18T09:00:00Z',thumb:'',views:1234,url:'https://vod.sooplive.com/player/1'}]},catch:{status:'ready',items:[]}}};
async function mount(Component){const node=document.getElementById('root'),r=createRoot(node);await act(async()=>r.render(React.createElement(Component)));return{node,close:async()=>act(async()=>r.unmount())};}
function button(node,text){return Array.from(node.querySelectorAll('button')).find(x=>x.textContent.trim()===text);}
function click(node){assert.ok(node,'click target');node.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));}
test('ranking renders separate lists, exact cumulative views and a genuine empty category',async()=>{
 global.fetch=async()=>Response.json(fixture);const m=await mount(Ranking);try{
  assert.ok(m.node.textContent.includes('1,234회'));assert.ok(m.node.textContent.includes('최근 7일에 올라온 캐치 영상이 없어요.'));
  assert.equal(m.node.querySelectorAll('ol li').length,1);assert.equal(m.node.querySelector('ol a').href,'https://vod.sooplive.com/player/1');
  assert.ok(m.node.textContent.includes('이번 주에 증가한 조회수 순위는 아니에요'));
 }finally{await m.close();}});
test('an upstream failure is shown as failure instead of an empty ranking',async()=>{
 global.fetch=async()=>Response.json({...fixture,rankings:{clip:{status:'error',items:[]},catch:{status:'ready',items:[]}}},{status:200});const m=await mount(Ranking);try{
 assert.ok(m.node.textContent.includes('클립 목록을 받아오지 못했어요'));assert.ok(!m.node.textContent.includes('최근 7일에 올라온 클립 영상이 없어요'));
 }finally{await m.close();}});
test('reload recovers from transport failure and incomplete results are labelled',async()=>{
 let calls=0;global.fetch=async()=>{if(++calls===1)throw new Error('offline');return Response.json({...fixture,rankings:{...fixture.rankings,clip:{...fixture.rankings.clip,status:'partial'}}});};
 const m=await mount(Ranking);try{
 assert.ok(m.node.textContent.includes('랭킹을 불러오지 못했어요'));await act(async()=>click(button(m.node,'새로고침')));assert.ok(m.node.textContent.includes('일부 영상만 확인됐어요'));assert.ok(m.node.textContent.includes('팬이 만든 클립'));
 }finally{await m.close();}});
test('calendar category selector and color settings include 구플 after loading old saved colors',async()=>{
 window.innerWidth=390;localStorage.setItem('mongna_secure_admin_v2','true');let saved;global.fetch=async(url,init)=>{if(init?.body)saved=JSON.parse(init.body);return Response.json({});};const m=await mount(Calendar);try{
 const add=Array.from(m.node.querySelectorAll('button')).find(x=>x.textContent.includes('일정 추가'));await act(async()=>click(add));assert.ok(button(m.node,'구플'));await act(async()=>click(button(m.node,'구플')));assert.equal(button(m.node,'구플').style.backgroundColor,'rgb(236, 72, 153)');
 const label=Array.from(m.node.querySelectorAll('label')).find(x=>x.textContent==='일정 제목');const input=label.parentElement.querySelector('input');await act(async()=>{input.value='구플 일정 테스트';require('react-dom/test-utils').Simulate.change(input);});await act(async()=>click(button(m.node,'일정 등록하기')));assert.equal(saved.documentId,'schedule_data');const schedule=Object.values(saved.data.data)[0][0];assert.equal(schedule.type,'구플');assert.equal(schedule.backgroundColor,'#ec4899');
 await act(async()=>click(m.node.querySelector('[title="카테고리 색상 설정"]')));assert.ok(m.node.textContent.includes('구플 색상'));
 const labels=Array.from(m.node.querySelectorAll('label'));assert.equal(labels.find(x=>x.textContent==='구플 색상').parentElement.querySelector('input').value,'#ec4899');
 }finally{await m.close();localStorage.clear();window.innerWidth=1024;}});
