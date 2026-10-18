'use client';

import React, { useEffect, useState } from 'react';
import styles from '../components/home/home.module.css';
import WeeklyVideoRanking from '../components/weekly-ranking/WeeklyVideoRanking';
import { CALENDAR_CATEGORY_COLORS } from '../lib/calendar-categories';
import { MainNavLinks, UtilityNavLinks } from '../components/SiteNavigation';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getMongnaAnniversaries } from '../utils/dday'; 

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [categoryColors, setCategoryColors] = useState<any>({ ...CALENDAR_CATEGORY_COLORS });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [ytError, setYtError] = useState('');

  const [inputHeroImg, setInputHeroImg] = useState('');
  const [inputYtChannelId, setInputYtChannelId] = useState('');
  const [inputIsLive, setInputIsLive] = useState(false);
  const [inputLinks, setInputLinks] = useState<any[]>([]);

  const [autoIsLive, setAutoIsLive] = useState(false); 
  const [liveThumb, setLiveThumb] = useState('');
  const { isBirthdayToday, isDebutToday, debutDays } = getMongnaAnniversaries();
  
  // 수동 켜기(homeData.isLive) 또는 자동 감지(autoIsLive) 중 하나라도 켜지면 방송중으로 표시
  const currentlyLive = homeData.isLive || autoIsLive;

  useEffect(() => {
    let active = true;
    const checkLive = async () => {
      try {
        const response = await fetch('/api/live');
        if (!response.ok) return;
        const data = await response.json();
        if (active && typeof data.isLive === 'boolean') {
          setAutoIsLive(data.isLive);
          setLiveThumb(typeof data.thumbnail === 'string' ? data.thumbnail : '');
        }
      } catch {}
    };
    void checkLive();
    const interval = setInterval(checkLive, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => { setIsMounted(true); }, []);

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

  const scheduleRows = (key: string): any[] => {
    const raw = scheduleData[key];
    return (Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : []).filter(Boolean);
  };
  const todaySchedules = scheduleRows(todayStr);
  const displayDate = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(todayObj);

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.brand} aria-label="몽나 홈"><img src="/logo-new.png" alt="몽나" /><span>FAN SPACE</span></a>
          <nav aria-label="몽나 메인 메뉴"><MainNavLinks /></nav>
          <div className={styles.headerActions}>
            <UtilityNavLinks plain />
            {isAdmin && <button className={styles.iconButton} onClick={openSettings} aria-label="홈페이지 설정">⚙</button>}
            <button className={styles.loginButton} onClick={toggleAdmin}>{isAdmin ? '관리자' : '관리자 로그인'}</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <div><p className={styles.eyebrow}>MONGNA · DALGU</p><h1>몽나, 그리고 달구</h1><p className={styles.introText}>방송부터 작은 순간까지, 함께 모아두는 공간.</p></div>
          <span className={styles.todayDate}>{displayDate}<i /></span>
        </div>

        {(isBirthdayToday || isDebutToday) && <aside className={styles.anniversary}>
          <span>함께 기념하는 오늘</span>
          {isBirthdayToday && <strong>몽나의 생일을 축하해 주세요!</strong>}
          {isDebutToday && <strong>몽나와 함께한 지 {debutDays.toLocaleString('ko-KR')}일</strong>}
        </aside>}

        <div className={styles.heroGrid}>
          <section className={styles.portraitCard} aria-label="몽나 메인 사진">
            <div className={styles.portraitTop}><span>OUR MONGNA</span><span>✦</span></div>
            <div className={styles.portraitImage}><img src={homeData.heroImg || '/mongna.png'} alt="몽나 메인 사진" data-fallback={!homeData.heroImg || undefined} onError={event => { if (event.currentTarget.dataset.fallback !== 'true') { event.currentTarget.src = '/mongna.png'; event.currentTarget.dataset.fallback = 'true'; } }} /></div>
            <div className={styles.portraitCaption}><div><strong>몽나</strong><span>달구와 함께 만드는 하루</span></div><span className={styles.captionStar}>✦</span></div>
          </section>

          <div className={styles.heroSide}>
            <section className={`${styles.panel} ${styles.livePanel}`} aria-label="몽나 방송 상태">
              <div className={styles.panelHeading}><h2>지금, 몽나는</h2><span className={`${styles.status} ${currentlyLive ? styles.onAir : ''}`}><i />{currentlyLive ? 'ON AIR' : 'OFFLINE'}</span></div>
              {currentlyLive && liveThumb ? <a className={styles.liveThumb} href="https://play.sooplive.co.kr/pinktape8" target="_blank" rel="noopener noreferrer"><img src={liveThumb} alt="몽나 생방송 썸네일" /></a> : <div className={styles.liveMessage}><img src="/dalgu.png" alt="" /><div><strong>{currentlyLive ? '몽나가 방송 중이에요' : '다음 방송에서 만나요'}</strong><p>{currentlyLive ? '달구들과 함께하는 지금 이 순간.' : '기다리는 동안 지난 순간들을 둘러보세요.'}</p></div></div>}
              <a className={styles.primaryLink} href="https://play.sooplive.co.kr/pinktape8" target="_blank" rel="noopener noreferrer">{currentlyLive ? '생방송 보러가기' : '몽나 방송국 가기'}<span>↗</span></a>
            </section>

            <section className={`${styles.panel} ${styles.todayPanel}`} aria-label="오늘의 일정">
              <div className={styles.panelHeading}><h2>오늘의 일정</h2><span>{todayObj.getMonth() + 1}.{String(todayObj.getDate()).padStart(2, '0')}</span></div>
              {todaySchedules.length ? <div className={styles.todayEvents}>{todaySchedules.map((sch, index) => <div className={styles.todayEvent} key={sch.id || index} style={{ '--event-color': getEventColor(sch) } as React.CSSProperties}><span>{sch.time || '시간 미정'}</span><strong>{sch.title}</strong><small>{sch.type || '방송'}</small></div>)}</div> : <div className={styles.noSchedule}><span>◇</span><p>오늘 등록된 일정이 없어요.</p><small>새 소식은 캘린더에서 확인해 주세요.</small></div>}
              <a href="/calendar" className={styles.subtleLink}>캘린더 전체 보기 <span>→</span></a>
            </section>
          </div>
        </div>

        <section className={styles.scheduleSection} aria-label="이번 주 일정">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>WEEKLY SCHEDULE</span><h2>이번 주, 함께할 시간</h2></div><a href="/calendar">전체 일정 <span>↗</span></a></div>
          <div className={styles.weekGrid}>
            {thisWeekKeys.map(day => {
              const rows = scheduleRows(day.key), isToday = day.key === todayStr;
              return <a href="/calendar" className={`${styles.dayCard} ${isToday ? styles.selectedDay : ''}`} key={day.key} aria-label={`${day.dateNum}일 ${dayNames[day.dayIdx]}요일 일정${isToday ? ', 오늘' : ''}`}>
                <div className={styles.dayHeader}><span className={day.dayIdx === 0 ? styles.sunday : day.dayIdx === 6 ? styles.saturday : ''}>{dayNames[day.dayIdx]}</span>{isToday && <small>오늘</small>}<strong>{day.dateNum}</strong></div>
                <div className={styles.dayEvents}>{rows.length ? rows.map((sch, index) => <div className={styles.weekEvent} key={sch.id || index} style={{ '--event-color': getEventColor(sch) } as React.CSSProperties}><span>{sch.time || '시간 미정'}</span><strong>{sch.title}</strong></div>) : <span className={styles.emptyDay}>등록된 일정 없음</span>}</div>
              </a>;
            })}
          </div>
        </section>

        <WeeklyVideoRanking />

        <section className={styles.videoSection} aria-label="몽튜브 최신 영상">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MONGTUBE</span><h2>다시 꺼내보는 순간</h2></div><a href="https://www.youtube.com/@mongnaaa" target="_blank" rel="noopener noreferrer">몽튜브 <span>↗</span></a></div>
          {ytError ? <div className={styles.emptyVideos}><p>{ytError}</p><a href="https://www.youtube.com/@mongnaaa" target="_blank" rel="noopener noreferrer">몽튜브에서 직접 보기 ↗</a></div> : <div className={styles.videoGrid}>{ytVideos.map((item, index) => {
            const video = item.snippet, id = item.id?.videoId || video?.resourceId?.videoId;
            if (!video || !id) return null;
            return <a className={styles.youtubeCard} key={id || index} href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"><div><img src={video.thumbnails?.high?.url || video.thumbnails?.medium?.url || ''} alt="" loading="lazy" /><span>▶</span></div><strong>{video.title}</strong><small>MONGTUBE ↗</small></a>;
          })}</div>}
        </section>

        <section className={styles.linksSection} aria-label="몽나 바로가기">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>STAY CONNECTED</span><h2>몽나를 만나는 곳</h2></div></div>
          <div className={styles.linkGrid}>{homeData.links.map((link: any, index: number) => <a key={index} href={link.url || '#'} target="_blank" rel="noopener noreferrer" className={styles.socialCard}><div className={styles.socialIcon}>{link.icon?.startsWith('http') ? <img src={link.icon} alt="" /> : <span>{link.icon || ['S', 'Y', 'C', 'I'][index] || '↗'}</span>}</div><div><strong>{link.title}</strong><span>{link.sub}</span></div><b>↗</b></a>)}</div>
        </section>
      </main>
      <footer className={styles.footer}><img src="/logo-new.png" alt="몽나" /><p>몽나와 달구가 함께 모아가는 순간들.</p><span>UNOFFICIAL FANPAGE · MADE WITH DALGU</span></footer>

      {isLoading && <div className={styles.loading} role="status"><img src="/logo-new.png" alt="몽나" /><p>몽나의 소식을 불러오고 있어요.</p></div>}

      {isModalOpen && <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
        <section className={styles.settingsModal} role="dialog" aria-modal="true" aria-labelledby="home-settings-title" onClick={event => event.stopPropagation()}>
          <div className={styles.modalHeading}><h2 id="home-settings-title">홈페이지 설정</h2><button onClick={() => setIsModalOpen(false)} aria-label="설정 닫기">×</button></div>
          <label className={styles.checkLabel}><input type="checkbox" checked={inputIsLive} onChange={event => setInputIsLive(event.target.checked)} />방송 중 표시 수동으로 켜기</label>
          <label>메인 사진 URL<input value={inputHeroImg} onChange={event => setInputHeroImg(event.target.value)} /></label>
          <label>유튜브 채널 ID<input value={inputYtChannelId} onChange={event => setInputYtChannelId(event.target.value)} /></label>
          <h3>몽나 바로가기</h3>
          {inputLinks.map((link, index) => <fieldset key={index}><legend>바로가기 {index + 1}</legend>{([{key:'title',label:'제목'},{key:'sub',label:'설명'},{key:'icon',label:'아이콘 또는 이미지 주소'},{key:'url',label:'URL'}] as const).map(field => <label key={field.key}>{field.label}<input value={link[field.key]} onChange={event => { const updated = [...inputLinks]; updated[index] = {...updated[index], [field.key]: event.target.value}; setInputLinks(updated); }} /></label>)}</fieldset>)}
          <button className={styles.saveButton} onClick={saveSettings}>설정 저장 및 적용하기</button>
        </section>
      </div>}
    </div>
  );
}
