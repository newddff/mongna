'use client';

import React, { useEffect, useState } from 'react';
import { MainNavLinks, UtilityNavLinks } from '../components/SiteNavigation';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { getMongnaAnniversaries } from '../utils/dday'; 

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false); 
  const [isMounted, setIsMounted] = useState(false);

  const [homeData, setHomeData] = useState({
    heroImg: '', ytChannelId: '', isLive: false,
    links: [
      { title: '숲 방송국', sub: '생방송 보러가기', icon: '📺', url: 'https://play.sooplive.co.kr/pinktape8' },
      { title: '유튜브', sub: '다시보기 & 하이라이트', icon: '🎬', url: 'https://www.youtube.com/@mongnaaa' },
      { title: '팬카페', sub: '소통과 정보 나눔', icon: '☕', url: 'https://cafe.naver.com/nightofmongna' },
      { title: '인스타그램', sub: '일상 공유', icon: '📷', url: 'https://www.instagram.com/m0n9na/' }
    ]
  });
  
  const [scheduleData, setScheduleData] = useState<any>({});
  const [categoryColors, setCategoryColors] = useState<any>({
    합방: "#4dabf7", 방송: "#ff9eb5", 휴방: "#9ca3af", 겜방: "#f59e0b", LCK: "#8b5cf6", 같이보기: "#20c997"
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [ytError, setYtError] = useState('');

  const [inputHeroImg, setInputHeroImg] = useState('');
  const [inputYtChannelId, setInputYtChannelId] = useState('');
  const [inputIsLive, setInputIsLive] = useState(false);
  const [inputLinks, setInputLinks] = useState<any[]>([]);

  const [autoIsLive, setAutoIsLive] = useState(false); 
  const [liveThumb, setLiveThumb] = useState(''); // 💡 실시간 썸네일 URL을 저장할 공간
  const [hotClips, setHotClips] = useState<any[]>([]); // 💡 캐치 랭킹 데이터 저장소
  const { isBirthdayToday, isDebutToday, debutDays } = getMongnaAnniversaries();
  
  // 수동 켜기(homeData.isLive) 또는 자동 감지(autoIsLive) 중 하나라도 켜지면 방송중으로 표시
  const currentlyLive = homeData.isLive || autoIsLive;

  // 💡 1분마다 SOOP API로 몽나님 방송 상태 & 썸네일 자동 확인 (수정됨)
  useEffect(() => {
    const checkSoopLive = async () => {
      try {
        const res = await fetch('/api/soop');
        const data = await res.json();
        
        // 몽나님(pinktape8) 방송 데이터 찾기
        const mongnaBroad = data.broad?.find((broad: any) => broad.user_id === 'pinktape8');
        
        if (mongnaBroad) {
          setAutoIsLive(true);
          setLiveThumb(mongnaBroad.broad_thumb); // 📸 SOOP이 주는 실시간 썸네일 저장
        } else {
          setAutoIsLive(false);
          setLiveThumb(''); // 방송 종료 시 썸네일 초기화
        }
      } catch (error) {
        console.error("SOOP 방송 상태 확인 실패", error);
      }
    };
    
    checkSoopLive();
    const interval = setInterval(checkSoopLive, 60000); 
    return () => clearInterval(interval);
  }, []);

  // 💡 주간 베스트 캐치 불러오기 (추가됨)
  useEffect(() => {
    fetch('/api/catch')
      .then(res => res.json())
      .then(data => {
        if (data.clips) setHotClips(data.clips);
      })
      .catch(err => console.error("캐치 로딩 실패:", err));
  }, []);

  // 💡 브라우저 사이즈 감지
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 💡 파이어베이스 데이터 연동
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('mongna_secure_admin_v2') === 'true');
    }

    const firebaseConfig = {
      apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
      authDomain: "mongna-vod.firebaseapp.com",
      projectId: "mongna-vod",
      storageBucket: "mongna-vod.firebasestorage.app",
      messagingSenderId: "310663611402",
      appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const homeRef = doc(db, 'mongna_calendar_data', 'home_settings_v2');
    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');
    const colorsRef = doc(db, 'mongna_calendar_data', 'category_colors'); 

    const unsubHome = onSnapshot(homeRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        if (data.links && data.links.length > 0) {
          setHomeData(data);
        }
      }
      setIsLoading(false);
    });

    const unsubSchedule = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists()) {
        setScheduleData(docSnap.data().data || {});
      }
    });

    const unsubColors = onSnapshot(colorsRef, (docSnap) => {
      if (docSnap.exists()) {
        setCategoryColors((prev: any) => ({ ...prev, ...(docSnap.data() as any) }));
      }
    });

    return () => {
      unsubHome();
      unsubSchedule();
      unsubColors(); 
    };
  }, []);

  // 💡 유튜브 영상 가져오기 (안전한 백엔드 API 호출)
  useEffect(() => {
    const channelId = (homeData.ytChannelId || 'UCtqsg-m0nnzd4o2vkYiP6rw').trim();

    fetch(`/api/youtube?channelId=${channelId}`)
      .then(res => res.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          setYtVideos(data.items);
          setYtError('');
        } else {
          setYtError("유튜브 영상을 불러오지 못했습니다.");
        }
      })
      .catch(() => setYtError("서버 오류가 발생했습니다."));
  }, [homeData.ytChannelId]);

  // 💡 관리자 로그인 로직 (안전한 백엔드 API 호출)
  const toggleAdmin = async () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        if (typeof window !== 'undefined') localStorage.removeItem('mongna_secure_admin_v2');
      }
    } else {
      const pwd = prompt("관리자 비밀번호 입력:");
      if (!pwd) return;

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });

      if (res.ok) {
        setIsAdmin(true);
        if (typeof window !== 'undefined') localStorage.setItem('mongna_secure_admin_v2', 'true');
        alert("관리자 인증 성공!");
      } else {
        alert("비밀번호 오류");
      }
    }
  };

  const openSettings = () => {
    setInputHeroImg(homeData.heroImg || '');
    setInputYtChannelId(homeData.ytChannelId || 'UCtqsg-m0nnzd4o2vkYiP6rw');
    setInputIsLive(homeData.isLive || false);
    setInputLinks(JSON.parse(JSON.stringify(homeData.links)));
    setIsModalOpen(true);
  };

  const saveSettings = async () => {
    const newData = {
      isLive: inputIsLive,
      heroImg: inputHeroImg.trim(),
      ytChannelId: inputYtChannelId.trim(),
      links: inputLinks
    };

    try {
      const res = await fetch('/api/admin/home-settings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        alert(res.status === 401 ? '관리자 세션이 만료되었습니다. 다시 로그인해주세요.' : '저장 실패!');
        return;
      }
      setIsModalOpen(false);
      alert('설정이 저장되었습니다!');
    } catch (e) {
      alert('저장 실패!');
    }
  };

  const getEventColor = (sch: any) => {
    if (sch.backgroundColor) return sch.backgroundColor;
    if (categoryColors[sch.type]) return categoryColors[sch.type]; 
    if (sch.color) return sch.color;
    if (sch.bgColor) return sch.bgColor;
    if (sch.eventColor) return sch.eventColor;
    if (sch.extendedProps?.backgroundColor) return sch.extendedProps.backgroundColor;
    if (sch.extendedProps?.color) return sch.extendedProps.color;

    const title = (sch.title || '').toLowerCase();
    if (title.includes('휴뱅') || title.includes('휴식')) return categoryColors['휴방'] || '#9ca3af';
    if (title.includes('lck') || title.includes('lol') || title.includes('롤') || title.includes('결승')) return categoryColors['LCK'] || '#8b5cf6';
    if (title.includes('탐정') || title.includes('게임') || title.includes('특집')) return categoryColors['겜방'] || '#f59e0b';
    if (title.includes('합방')) return categoryColors['합방'] || '#4dabf7';
    
    return categoryColors['방송'] || '#ff9eb5';
  };

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;
  const currentDay = todayObj.getDay();
  const sunday = new Date(todayObj.getTime());
  sunday.setDate(todayObj.getDate() - currentDay);

  const thisWeekKeys = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    thisWeekKeys.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      dateNum: d.getDate(),
      dayIdx: d.getDay()
    });
  }

  // 💡 1. Next.js의 Head 태그를 사용하여 탭 아이콘(파비콘)을 설정합니다.
  if (!isMounted) return null;

  return (
    <>
      <head>
        <link rel="icon" href="/logo-new.png" />
      </head>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .nav-container { flex-direction: column !important; height: auto !important; padding: 15px 20px !important; gap: 15px; }
          .nav-links { flex-wrap: wrap !important; justify-content: center !important; font-size: 14px !important; gap: 15px !important; }
          .top-btn-group { width: 100%; justify-content: center; }
          
          .main-container { flex-direction: column !important; padding: 20px 15px !important; gap: 30px !important; margin: 0 auto !important; }
          .left-profile { position: static !important; width: 100% !important; max-width: 320px !important; margin: 0 auto !important; }
          .content-area { padding-bottom: 20px !important; }
          
          .yt-grid { grid-template-columns: 1fr !important; }
          .link-grid { grid-template-columns: 1fr !important; }
        }

        @keyframes live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(1); }
        }
        @keyframes live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* 💡 2. 다크모드일 때 로고 주변에 하얀 빛 번짐(후광) 효과 주기 */
        html:not([data-theme="light"]) .logo-img {
          filter: drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.8));
        }
      `}} />

      <div style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)', color: '#1e293b', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
        
        {isLoading && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <img src="/logo-new.png" alt="로고" style={{ height: '50px', marginBottom: '20px' }} />
            <div style={{ color: '#a855f7', fontWeight: 800, fontSize: '15px' }}>데이터를 불러오는 중입니다... 🌙</div>
          </div>
        )}

        <div className="nav-container" style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(168, 85, 247, 0.1)' }}>
          {/* 💡 3. 메인 로고 교체 완료 */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo-new.png" alt="몽나 로고" className="logo-img" style={{ height: '40px', objectFit: 'contain' }} />
          </a>

          <MainNavLinks />

          <div className="top-btn-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <UtilityNavLinks />
            {currentlyLive && (
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>방송중</div>
            )}
            {isAdmin && (
              <button onClick={openSettings} style={{ background: '#f1f5f9', border: 'none', fontSize: '18px', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</button>
            )}
            <button onClick={toggleAdmin} style={{ background: isAdmin ? '#ffd700' : 'white', border: '1px solid #ddd', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isAdmin ? '👑 관리자' : '🔒 로그인'}
            </button>
          </div>
        </div>

        <div className="main-container" style={{ maxWidth: '1500px', margin: '40px auto', padding: '0 40px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
          
          <div className="left-profile" style={{ flex: 1, position: 'sticky', top: '110px', display: 'flex' }}>
            <img 
              src={homeData.heroImg || 'https://via.placeholder.com/600x800/e2e8f0/94a3b8?text=Admin+Setting+Image'} 
              alt="메인 사진" 
              style={{ width: '100%', aspectRatio: '3/4', borderRadius: '32px', objectFit: 'cover', background: 'white', border: '6px solid white', boxSizing: 'border-box', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} 
            />
          </div>

          <div className="content-area" style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '50px', paddingBottom: '60px' }}>
            
            {/* 💡 실시간 썸네일 & 생방송 배지 렌더링 부분 */}
            {currentlyLive && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '-10px' }}>
                
                {liveThumb && (
                  <img 
                    src={liveThumb} 
                    alt="몽나 실시간 생방송" 
                    style={{ 
                      width: '100%', 
                      maxWidth: '450px', 
                      aspectRatio: '16/9', 
                      borderRadius: '20px', 
                      objectFit: 'cover',
                      border: '3px solid #ef4444',
                      boxShadow: '0 10px 30px rgba(239, 68, 68, 0.25)'
                    }} 
                  />
                )}

                <a 
                  href="https://play.sooplive.co.kr/pinktape8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#ef4444', color: 'white', padding: '12px 24px',
                    borderRadius: '30px', fontWeight: 900, fontSize: '16px',
                    textDecoration: 'none', animation: 'live-pulse 2s infinite'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', animation: 'live-dot 1s infinite' }}></div>
                  몽나님 현재 생방송 중! 보러가기 🏃‍♀️
                </a>
              </div>
            )}

            {(isBirthdayToday || isDebutToday) && (
              <div style={{
                background: 'linear-gradient(90deg, #fce7f3 0%, #f3e8ff 100%)',
                border: '1px solid #fbcfe8', padding: '20px', borderRadius: '24px',
                textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                marginBottom: '-20px'
              }}>
                {isBirthdayToday && (
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#db2777', margin: 0, marginBottom: isDebutToday ? '10px' : '0' }}>
                    🎉 오늘은 몽나님 생일입니다! 모두 축하해 주세요! 🎉
                  </h2>
                )}
                {isDebutToday && (
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#9333ea', margin: 0 }}>
                    🎙️ 오늘은 몽나님 방송 데뷔 {debutDays}일째 되는 날! 🎙️
                  </h2>
                )}
              </div>
            )}

            {/* 이번 주 일정 */}
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: isMobile ? '25px 20px' : '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>📅 이번 주 일정</h3>
                <a href="/calendar" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none', background: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>전체보기</a>
              </div>
              
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {thisWeekKeys.map(dayObj => {
                    const daySchedules = scheduleData[dayObj.key] || [];
                    const isToday = (dayObj.key === todayStr);
                    let dateColor = '#1e293b';
                    if (dayObj.dayIdx === 0) dateColor = '#ef4444';
                    else if (dayObj.dayIdx === 6) dateColor = '#3b82f6';

                    return (
                      <div key={dayObj.key} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: isToday ? '#f8f4ff' : '#fff', borderRadius: '16px', padding: '15px', border: isToday ? '2px solid #a855f7' : '1px solid #f1f5f9' }}>
                        <div style={{ minWidth: '45px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{dayNames[dayObj.dayIdx]}</div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: dateColor }}>{dayObj.dateNum}</div>
                        </div>
                        <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch' }}></div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {daySchedules.length > 0 ? (
                            daySchedules.map((sch: any, idx: number) => {
                              const bgColor = getEventColor(sch); 
                              return (
                                <div key={idx} style={{ background: bgColor, color: 'white', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {sch.time && sch.time !== '시간 미정' && <span style={{ fontSize: '12px', opacity: 0.9 }}>⏰ {sch.time}</span>}
                                  <span>{sch.title}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500, padding: '5px 0' }}>일정이 없습니다.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', width: '100%' }}>
                  {thisWeekKeys.map(dayObj => {
                    const daySchedules = scheduleData[dayObj.key] || [];
                    const isToday = (dayObj.key === todayStr);
                    let dateColor = '#1e293b';
                    if (dayObj.dayIdx === 0) dateColor = '#ef4444';
                    else if (dayObj.dayIdx === 6) dateColor = '#3b82f6';

                    return (
                      <div key={dayObj.key} style={{ border: isToday ? '2px solid #a855f7' : '1px solid #f1f5f9', borderRadius: '16px', padding: '10px', background: isToday ? '#f3e8ff' : '#ffffff', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: dateColor, marginBottom: '2px', textAlign: 'center' }}>
                          {dayObj.dateNum}
                        </div>
                        {daySchedules.map((sch: any, idx: number) => {
                          const bgColor = getEventColor(sch); 
                          const txtColor = sch.textColor || (sch.extendedProps && sch.extendedProps.textColor) || 'white';
                          
                          return (
                            <div key={idx} style={{ borderRadius: '8px', padding: '6px', color: txtColor, fontSize: '11px', backgroundColor: bgColor, wordBreak: 'keep-all', overflowWrap: 'anywhere', lineHeight: '1.3', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}>
                              <div style={{ background: 'rgba(0,0,0,0.15)', display: 'inline-block', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 900, marginBottom: '4px', color: 'white' }}>
                                [{sch.time || '미정'}]
                              </div>
                              <div style={{ fontWeight: 'bold' }}>{sch.title}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🏆 주간 레전드 캐치 랭킹 섹션 */}
            {hotClips.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>🏆 이번 주 레전드 캐치 TOP 3</div>
                <div className="yt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {hotClips.map((clip, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const medalColors = ['#fbbf24', '#94a3b8', '#b45309'];

                    return (
                      <a key={idx} href={clip.url} target="_blank" rel="noreferrer" style={{ background: '#ffffff', borderRadius: '20px', padding: '15px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', position: 'relative', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        
                        {/* 순위 금/은/동 배지 */}
                        <div style={{ position: 'absolute', top: '-10px', left: '-10px', background: medalColors[idx], color: 'white', padding: '8px 14px', borderRadius: '16px', fontWeight: 900, zIndex: 10, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                          {medals[idx]} {idx + 1}위
                        </div>
                        
                        <div style={{ position: 'relative', marginTop: '10px' }}>
                           <img src={clip.thumb} alt="썸네일" style={{ width: '100%', aspectRatio: '16/9', background: '#f1f5f9', borderRadius: '12px', marginBottom: '15px', objectFit: 'cover' }} />
                           {/* 조회수 표시 */}
                           <div style={{ position: 'absolute', bottom: '22px', right: '8px', background: 'rgba(0,0,0,0.75)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                              👀 {clip.views.toLocaleString()}회
                           </div>
                        </div>
                        
                        <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {clip.title}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 유튜브 섹션 */}
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>▶️ 몽튜브 최신 영상</div>
              {ytError ? (
                <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '14px', padding: '40px 0', background: 'white', borderRadius: '20px' }} dangerouslySetInnerHTML={{ __html: ytError }} />
              ) : (
                <div className="yt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {ytVideos.map((item, idx) => {
                    const video = item.snippet;
                    const videoId = item.id.videoId || video.resourceId?.videoId;
                    const thumb = video.thumbnails?.medium?.url || '';
                    return (
                      <a key={idx} href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" style={{ background: '#ffffff', borderRadius: '20px', padding: '15px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <img src={thumb} alt="썸네일" style={{ width: '100%', aspectRatio: '16/9', background: '#f1f5f9', borderRadius: '12px', marginBottom: '15px', objectFit: 'cover' }} />
                        <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.4' }}>{video.title}</div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 몽나링크 섹션 */}
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>🔗 몽나링크</div>
              <div className="link-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {homeData.links.map((link: any, idx: number) => (
                  <a key={idx} href={link.url || '#'} target="_blank" rel="noreferrer" style={{ background: '#ffffff', borderRadius: '20px', padding: '22px', display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', color: '#1e293b', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', position: 'relative' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
                      {link.icon && link.icon.startsWith('http') ? (
                        <img src={link.icon} alt="아이콘" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        link.icon || '🔗'
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>{link.title}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{link.sub}</div>
                    </div>
                  </a>
                ))}
                

              </div>
            </div>
          </div>
        </div>

        {/* 관리자 설정 모달 */}
        {isModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
            <div style={{ background: 'white', borderRadius: '24px', width: '650px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#a855f7', marginBottom: '20px' }}>⚙️ 홈페이지 설정</h2>
              
              <div style={{ marginBottom: '20px', background: '#fff0f0', padding: '15px', borderRadius: '12px' }}>
                <label style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={inputIsLive} onChange={e => setInputIsLive(e.target.checked)} />
                  🚨 현재 방송중 배지 강제 켜기 (수동)
                </label>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📸 좌측 메인 사진 URL</label>
                <input type="text" value={inputHeroImg} onChange={e => setInputHeroImg(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>▶ 유튜브 채널 ID</label>
                <input type="text" value={inputYtChannelId} onChange={e => setInputYtChannelId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>🔗 몽나링크 4개 설정</h3>
              {inputLinks.map((l, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input type="text" placeholder="제목" value={l.title} onChange={e => { const n = [...inputLinks]; n[i].title = e.target.value; setInputLinks(n); }} style={{ flex: 1, padding: '6px' }} />
                    <input type="text" placeholder="설명" value={l.sub} onChange={e => { const n = [...inputLinks]; n[i].sub = e.target.value; setInputLinks(n); }} style={{ flex: 1, padding: '6px' }} />
                  </div>
                  <input type="text" placeholder="아이콘(이모티콘 또는 이미지 주소)" value={l.icon} onChange={e => { const n = [...inputLinks]; n[i].icon = e.target.value; setInputLinks(n); }} style={{ width: '100%', marginBottom: '8px', padding: '6px', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="URL" value={l.url} onChange={e => { const n = [...inputLinks]; n[i].url = e.target.value; setInputLinks(n); }} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />
                </div>
              ))}

              <button onClick={saveSettings} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', width: '100%', marginTop: '20px', cursor: 'pointer' }}>설정 저장 및 적용하기</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
