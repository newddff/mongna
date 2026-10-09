'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

const mainItems = [
  { href: '/', title: '홈' },
  { href: '/wiki', title: '몽무위키' },
  { href: '/calendar', title: '캘린더' },
  { href: '/song.html', title: '노래책' },
  { href: '/reward.html', title: '업보(보상)' },
  { href: '/minigames', title: '미니게임' }
];

export function MainNavLinks() {
  const pathname = usePathname();
  return (
    <div className="nav-links" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 'clamp(10px, 1.7vw, 30px)', fontWeight: 800, fontSize: '15px' }}>
      {mainItems.map(item => (
        <a key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
          style={{ textDecoration: 'none', color: pathname === item.href ? '#8b5cf6' : '#1e293b', whiteSpace: 'nowrap' }}>
          {item.title}
        </a>
      ))}
    </div>
  );
}

export function UtilityNavLinks() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <a href="/vod.html" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #eadcf7', background: '#faf5ff', color: '#7350a1', borderRadius: '20px', padding: '7px 11px', fontWeight: 800, fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>💜 몽다살</a>
      <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #eadcf7', background: '#faf5ff', color: '#7350a1', borderRadius: '20px', padding: '7px 11px', fontWeight: 800, fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>📊 대시보드</a>
    </div>
  );
}

// 기존에 상단 공통바가 없는 게임·방송 현황 화면에만 공통바 표시
export function SecondaryPageNavigation() {
  const pathname = usePathname();
  if (!pathname.startsWith('/minigames') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/game/')) return null;
  return (
    <nav aria-label="몽나 공통 상단 메뉴" style={{ position:'relative', zIndex:110, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', padding:'14px 24px', background:'rgba(255,255,255,.97)', borderBottom:'1px solid #eadcf7', fontFamily:'Pretendard,sans-serif' }}>
      <a href="/" aria-label="몽나 홈"><img src="/logo-new.png" alt="몽나" style={{height:36,objectFit:'contain'}} /></a>
      <MainNavLinks />
      <UtilityNavLinks />
    </nav>
  );
}
