const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM('<div id="root"></div>',{url:'https://mongna.vercel.app/streamer/minigames'});
global.window=dom.window;global.self=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const cache=new Map();
function load(relative){
const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file).exports;
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);
const native=mod.require.bind(mod);mod.require=name=>{
 if(name.endsWith('.css'))return{__esModule:true,default:new Proxy({}, {get:(_,key)=>String(key)})};
 if(name.startsWith('.')){const target=path.resolve(path.dirname(file),name);return load(path.relative(root,fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx'));}
 return native(name);
};mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return mod.exports;
}
const Game=load('src/components/board-games/ChatBoardGame.tsx').default;
const Page=load('src/app/streamer/minigames/page.tsx').default;
const click=element=>{assert.ok(element,'click target exists');element.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));};
const button=(container,text)=>Array.from(container.querySelectorAll('button')).find(el=>el.textContent===text);
const square=(container,key)=>container.querySelector(`[data-square="${key}"]`);
async function mounted(kind){
let listener;const subscribe=cb=>{listener=cb;return()=>{listener=null;};};
const reactRoot=createRoot(document.getElementById('root'));
await act(async()=>reactRoot.render(React.createElement(Game,{kind,enabled:true,subscribe})));
return{root:reactRoot,container:document.getElementById('root'),send:async(userId,text)=>act(async()=>listener({userId,nickname:userId,text})),props:enabled=>({kind,enabled,subscribe}),close:async()=>act(async()=>reactRoot.unmount())};
}
test('gomoku UI accepts votes, resolves a tie by host choice and rejects duplicate votes',async()=>{
const m=await mounted('gomoku');try{
await act(async()=>click(square(m.container,'h8')));assert.ok(m.container.textContent.includes('달구의 차례'));
await m.send('u','H9');await m.send('u','h10');await m.send('v','h10');
await act(async()=>click(button(m.container,'지금 투표 마감')));
assert.ok(m.container.textContent.includes('동률이에요'));
await act(async()=>click(button(m.container,'h9')));
assert.ok(square(m.container,'h9').getAttribute('aria-label').includes('달구'));assert.ok(m.container.textContent.includes('몽나의 차례'));
}finally{await m.close();}});
test('no-vote round waits for another poll rather than making an arbitrary move',async()=>{
const m=await mounted('gomoku');try{await act(async()=>click(square(m.container,'h8')));await act(async()=>click(button(m.container,'지금 투표 마감')));assert.ok(m.container.textContent.includes('유효한 투표가 없어요'));assert.ok(square(m.container,'h9').getAttribute('aria-label').includes('빈칸'));await act(async()=>click(button(m.container,'다시 집계')));assert.ok(m.container.textContent.includes('채팅 투표를 받고 있어요'));}finally{await m.close();}});
test('disconnected/hidden game rejects votes and freezes its timer',async()=>{
const m=await mounted('gomoku');try{
await act(async()=>click(square(m.container,'h8')));
await act(async()=>m.root.render(React.createElement(Game,m.props(false))));
const before=m.container.querySelector('.voteStats').textContent;
await m.send('u','h9');assert.equal(m.container.querySelector('.chatPanel').textContent.includes('u'),false);
await act(async()=>{await new Promise(r=>setTimeout(r,1100));});assert.equal(m.container.querySelector('.voteStats').textContent,before);
await act(async()=>m.root.render(React.createElement(Game,m.props(true))));await m.send('u','h9');assert.ok(m.container.querySelector('.chatPanel').textContent.includes('u'));
}finally{await m.close();}});
test('chess UI uses from/to clicks and spectator coordinate voting',async()=>{
const m=await mounted('chess');try{
await act(async()=>click(square(m.container,'e2')));assert.ok(m.container.textContent.includes('e2e4'));
await act(async()=>click(square(m.container,'e4')));
await m.send('x','e7e4');await m.send('x','e7e5');await act(async()=>click(button(m.container,'지금 투표 마감')));
assert.ok(square(m.container,'e5').getAttribute('aria-label').includes('달구'));assert.ok(m.container.textContent.includes('2수 진행'));
}finally{await m.close();}});
test('janggi UI lets the host move and viewers vote a valid reply',async()=>{
const m=await mounted('janggi');try{
await act(async()=>click(square(m.container,'a4')));await act(async()=>click(square(m.container,'a5')));
await m.send('x','a7a8');await m.send('x','a7a6');await act(async()=>click(button(m.container,'지금 투표 마감')));
assert.ok(square(m.container,'a6').getAttribute('aria-label').includes('달구'));assert.ok(m.container.textContent.includes('2수 진행'));
}finally{await m.close();}});
test('streamer can choose second player and new-round duration',async()=>{
const m=await mounted('chess');try{
const order=Array.from(m.container.querySelectorAll('select')).find(s=>s.querySelector('option[value="0"]'));
await act(async()=>{order.value='1';order.dispatchEvent(new window.Event('change',{bubbles:true}));});
await act(async()=>click(button(m.container,'새 대국 시작')));assert.ok(m.container.textContent.includes('달구의 차례'));
await m.send('x','e2e4');await act(async()=>click(button(m.container,'지금 투표 마감')));assert.ok(m.container.textContent.includes('몽나의 차례'));
}finally{await m.close();}});
test('game switching preserves boards, isolates votes and keeps one SDK connection',async()=>{
let instance,count=0;const originalFetch=global.fetch;
window.SOOP={ChatSDK:class{constructor(){instance=this;count++;}handleReady(cb){this.ready=cb;}handleMessageReceived(cb){this.message=cb;}handleChatClosed(){}handleError(){}setAuth(){}getRoomInfo(){return{bjId:'pinktape8'}}connect(){this.ready();return Promise.resolve(true)}destroy(){}disconnect(){}}};
global.fetch=async()=>Response.json({authenticated:true,live:true,clientId:'mock',streamerId:'pinktape8',accessToken:'mock'});
const reactRoot=createRoot(document.getElementById('root'));
try{
await act(async()=>{reactRoot.render(React.createElement(Page));await Promise.resolve();});
const tab=name=>Array.from(document.querySelectorAll('nav button')).find(b=>b.querySelector('strong').textContent===name);
const panel=name=>document.querySelector(`[aria-label="${name} 대국"]`);
await act(async()=>click(tab('오목')));await act(async()=>click(square(panel('오목'),'h8')));
await act(async()=>click(tab('체스')));
await act(async()=>instance.message('MESSAGE',{userId:'x',userNickname:'x',message:'h9'}));assert.equal(panel('오목').querySelector('.chatPanel').textContent.includes('x'),false);
await act(async()=>click(tab('오목')));assert.ok(square(panel('오목'),'h8').getAttribute('aria-label').includes('몽나'));
await act(async()=>instance.message('MESSAGE',{userId:'x',userNickname:'x',message:'h9'}));assert.ok(panel('오목').querySelector('.chatPanel').textContent.includes('x'));assert.equal(count,1);
}finally{await act(async()=>reactRoot.unmount());global.fetch=originalFetch;delete window.SOOP;}});

test('SOOP song player gates intake, shows the next three and advances while intake is closed', async () => {
  const SongPage = load('src/app/streamer/song-requests/page.tsx').default;
  const originalFetch = global.fetch;
  const originalBroadcast = global.BroadcastChannel;
  const channelPeers = new Set();
  global.BroadcastChannel = class {
    constructor() { channelPeers.add(this); }
    postMessage(data) {
      for (const peer of channelPeers) {
        if (peer !== this) queueMicrotask(() => peer.onmessage?.({ data }));
      }
    }
    close() { this.onmessage = null; channelPeers.delete(this); }
  };
  let sdk, events, yt;
  const loads = [];
  window.SOOP = { ChatSDK: class {
    constructor() { sdk = this; }
    handleReady(cb) { this.ready = cb; }
    handleMessageReceived(cb) { this.message = cb; }
    handleChatClosed() {}
    handleError() {}
    setAuth() {}
    getRoomInfo() { return { bjId: 'pinktape8' }; }
    async connect() { this.ready(); }
    destroy() {}
  }};
  window.YT = { Player: class {
    constructor(el, options) {
      yt = this; events = options.events;
      queueMicrotask(() => events.onReady({ target: this }));
    }
    loadVideoById(id) { loads.push(id); }
    getVideoData() { return { title: '영상 ' + loads.at(-1), video_id: loads.at(-1) }; }
    destroy() {}
    stopVideo() {}
  }};
  let releaseSearch;
  global.fetch = async url => {
    if (url === '/api/soop/chat/session') return Response.json({ authenticated: true, live: true, clientId: 'mock', streamerId: 'pinktape8', accessToken: 'mock' });
    return new Promise(resolve => { releaseSearch = resolve; });
  };
  const container = document.getElementById('root');
  const reactRoot = createRoot(container);
  const overlayContainer = document.createElement('div');
  document.body.append(overlayContainer);
  const overlayRoot = createRoot(overlayContainer);
  const Overlay = load('src/app/streamer/song-requests/overlay/page.tsx').default;
  const send = (userId, message) => sdk.message('MESSAGE', { userId, userNickname: userId, message });
  try {
    await act(async () => {
      reactRoot.render(React.createElement(SongPage));
      overlayRoot.render(React.createElement(Overlay));
    });
    await act(async () => send('closed', '!신청곡 https://youtu.be/00000000000'));
    await act(async () => click(button(container, '채팅 접수 열기')));
    await act(async () => {
      send('first', '!신청곡 아이유 - 밤편지');
      send('second', '!신청곡 https://youtu.be/22222222222');
      send('third', '!신청곡 https://youtu.be/33333333333');
      send('fourth', '!신청곡 https://youtu.be/44444444444');
      send('fifth', '!신청곡 https://youtu.be/55555555555');
    });
    assert.equal(container.querySelectorAll('ol li').length, 0);
    await act(async () => releaseSearch(Response.json({ videoId: '11111111111', title: '밤편지' })));
    assert.equal(container.querySelectorAll('ol li').length, 5);
    await act(async () => click(button(container, '재생 시작')));
    assert.deepEqual(loads, ['11111111111']);
    assert.deepEqual(Array.from(overlayContainer.querySelectorAll('li small'), el => el.textContent),
      ['second', 'third', 'fourth']);
    assert.match(overlayContainer.textContent, /외 1곡/);
    await act(async () => click(button(container, '채팅 접수 닫기')));
    await act(async () => send('closed', '!신청곡 https://youtu.be/00000000000'));
    assert.equal(container.querySelectorAll('ol li').length, 4);
    assert.equal(overlayContainer.querySelectorAll('li').length, 3);
    await act(async () => {
      events.onStateChange({ target: yt, data: 1 });
      events.onStateChange({ target: yt, data: 0 });
    });
    await act(async () => events.onError({ target: yt, data: 150 }));
    assert.deepEqual(loads, ['11111111111', '22222222222', '33333333333']);
  } finally {
    await act(async () => { overlayRoot.unmount(); reactRoot.unmount(); });
    overlayContainer.remove();
    global.fetch = originalFetch; global.BroadcastChannel = originalBroadcast;
    delete window.YT; delete window.SOOP;
  }
});
