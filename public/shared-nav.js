/* 공통 링크 정의: 정적 HTML 페이지의 메뉴 통일 */
(() => {
  const items = [['/','홈'],['/wiki','몽무위키'],['/calendar','캘린더'],['/song.html','노래책'],['/reward.html','업보(보상)'],['/minigames','미니게임']];
  const nav = document.querySelector('.nav-menu');
  if (!nav) return;
  nav.innerHTML = '';
  for (const [href,label] of items) {
    const a=document.createElement('a'); a.href=href; a.textContent=label;
    a.style.cssText='text-decoration:none;color:'+(location.pathname===href?'#8b5cf6':'#1e293b')+';font-weight:800;white-space:nowrap;';
    nav.append(a);
  }
  nav.style.cssText='display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:clamp(10px,1.7vw,30px);font-size:15px;';
  const actions = document.querySelector('.nav-actions, .right-menu') || document.querySelector('.top-bar > .admin-btn');
  if (!actions) return;
  const utilities=document.createElement('div');
  utilities.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
  for (const [href,label] of [['/vod.html','💜 몽다살'],['/dashboard','📊 대시보드']]) {
    const a=document.createElement('a');a.href=href;a.textContent=label;
    a.style.cssText='display:inline-flex;align-items:center;background:#faf5ff;border:1px solid #eadcf7;color:#7350a1;border-radius:20px;padding:7px 11px;text-decoration:none;font-weight:800;font-size:13px;white-space:nowrap;';
    utilities.append(a);
  }
  if (actions.matches('button')) actions.before(utilities); else actions.prepend(utilities);
})();
