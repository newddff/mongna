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
