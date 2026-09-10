'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [homeData, setHomeData] = useState({
    heroImg: '', ytChannelId: '', ytApiKey: '', isLive: false,
    links: [
      { title: '숲 방송국', sub: '생방송 보러가기', icon: '📺', url: 'https://www.sooplive.com/station/pinktape8' },
      { title: '유튜브', sub: '다시보기 & 하이라이트', icon: '🎬', url: 'https://www.youtube.com/@mongnaaa' },
      { title: '팬카페', sub: '소통과 정보 나눔', icon: '☕', url: 'https://cafe.naver.com/nightofmongna' },
      { title: '인스타그램', sub: '일상 공유', icon: '📷', url: 'https://www.instagram.com/m0n9na/' }
    ]
  });
  const [scheduleData, setScheduleData] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [ytError, setYtError] = useState('');

  const [inputHeroImg, setInputHeroImg] = useState('');
  const [inputYtChannelId, setInputYtChannelId] = useState('');
  const [inputYtApiKey, setInputYtApiKey] = useState('');
  const [inputIsLive, setInputIsLive] = useState(false);
  const [inputLinks, setInputLinks] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('mongna_home_admin') === 'true');
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

    return () => {
      unsubHome();
      unsubSchedule();
    };
  }, []);

  useEffect(() => {
    const channelId = (homeData.ytChannelId || 'UCtqsg-m0nnzd4o2vkYiP6rw').trim();
    const apiKey = homeData.ytApiKey;

    if (!apiKey) {
      setYtError("구글 유튜브 API 키가 입력되지 않았습니다. 설정(⚙️) 창을 열어 키를 붙여넣어 주세요!");
      return;
    }

    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=3&key=${apiKey}`;

    fetch(playlistUrl)
      .then(res => {
        if (!res.ok) throw new Error(res.status.toString());
        return res.json();
      })
      .then(data => {
        setYtVideos(data.items || []);
        setYtError('');
      })
      .catch(err => {
        if (err.message === "404") {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=3&order=date&type=video&key=${apiKey}`;
          fetch(searchUrl)
            .then(res => res.json())
            .then(data => {
              setYtVideos(data.items || []);
              setYtError('');
            })
            .catch(() => setYtError("유튜브 API 오류가 발생했습니다. 채널 ID를 확인해주세요."));
        } else if (err.message === "403") {
          setYtError("API 키 권한 거부 (403): 구글 콘솔 설정을 확인해주세요.");
        } else {
          setYtError("유튜브 API 오류가 발생했습니다.");
        }
      });
  }, [homeData.ytChannelId, homeData.ytApiKey]);

  const toggleAdmin = () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        if (typeof window !== 'undefined') localStorage.removeItem('mongna_home_admin');
      }
    } else {
      const pwd = prompt("관리자 비밀번호 입력:");
      if (pwd === "mongna1234") {
        setIsAdmin(true);
        if (typeof window !== 'undefined') localStorage.setItem('mongna_home_admin', 'true');
        alert("관리자 인증 성공!");
      } else if (pwd) {
        alert("비밀번호 오류");
      }
    }
  };

  const openSettings = () => {
    setInputHeroImg(homeData.heroImg || '');
    setInputYtChannelId(homeData.ytChannelId || 'UCtqsg-m0nnzd4o2vkYiP6rw');
    setInputYtApiKey(homeData.ytApiKey || '');
    setInputIsLive(homeData.isLive || false);
    setInputLinks(JSON.parse(JSON.stringify(homeData.links)));
    setIsModalOpen(true);
  };

  const saveSettings = async () => {
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

    const newData = {
      isLive: inputIsLive,
      heroImg: inputHeroImg.trim(),
      ytChannelId: inputYtChannelId.trim(),
      ytApiKey: inputYtApiKey.trim(),
      links: inputLinks
    };

    try {
      await setDoc(homeRef, newData, { merge: true });
      setIsModalOpen(false);
      alert("설정이 파이어베이스에 안전하게 저장되었습니다!");
    } catch (e) {
      alert("저장 실패!");
    }
  };

  const getEventColor = (sch: any) => {
    if (sch.backgroundColor) return sch.backgroundColor;
    if (sch.color) return sch.color;
    if (sch.bgColor) return sch.bgColor;
    if (sch.eventColor) return sch.eventColor;
    if (sch.extendedProps?.backgroundColor) return sch.extendedProps.backgroundColor;
    if (sch.extendedProps?.color) return sch.extendedProps.color;

    const title = (sch.title || '').toLowerCase();
    if (title.includes('휴뱅') || title.includes('휴식')) return '#6b7280';
    if (title.includes('lck') || title.includes('lol') || title.includes('롤') || title.includes('결승')) return '#7c3aed';
    if (title.includes('탐정') || title.includes('게임') || title.includes('특집') || title.includes('합방')) return '#d97706';
    return '#fb819e';
  };

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;
  const currentDay = todayObj.getDay();
  const sunday = new Date(todayObj.getTime());
  sunday.setDate(todayObj.getDate() - currentDay);

  const thisWeekKeys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    thisWeekKeys.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      dateNum: d.getDate(),
      dayIdx: d.getDay()
    });
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)', color: '#1e293b', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      {isLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="로고" style={{ height: '50px', marginBottom: '20px' }} />
          <div style={{ color: '#a855f7', fontWeight: 800, fontSize: '15px' }}>데이터를 불러오는 중입니다... 🌙</div>
        </div>
      )}

      {/* 홈 화면 상단바 (캘린더 링크를 /calendar로 고정) */}
      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(168, 85, 247, 0.1)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="로고" style={{ height: '40px', objectFit: 'contain' }} />
        </a>

        <div style={{ display: 'flex', gap: '30px', fontWeight: 800, fontSize: '15px' }}>
          <a href="/" style={{ textDecoration: 'none', color: '#a855f7' }}>홈</a>
          <a href="/wiki" style={{ textDecoration: 'none', color: 'inherit' }}>몽무위키</a>
          <a href="/calendar" style={{ textDecoration: 'none', color: '#1e293b' }}>캘린더</a>
          <a href="/song.html" style={{ textDecoration: 'none', color: '#1e293b' }}>노래책</a>
          <a href="/reward.html" style={{ textDecoration: 'none', color: '#1e293b' }}>업보(보상)</a>
          <a href="/vod.html" style={{ textDecoration: 'none', color: '#1e293b' }}>VOD</a>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {homeData.isLive && (
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

      <div style={{ maxWidth: '1500px', margin: '40px auto', padding: '0 40px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, position: 'sticky', top: '110px', height: 'calc(100vh - 150px)', minHeight: '500px', display: 'flex' }}>
          <img src={homeData.heroImg || 'https://via.placeholder.com/600x800/e2e8f0/94a3b8?text=Admin+Setting+Image'} alt="메인 사진" style={{ width: '100%', height: '100%', borderRadius: '32px', objectFit: 'cover', background: 'white', border: '6px solid white', boxSizing: 'border-box' }} />
        </div>

        <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '50px', paddingBottom: '60px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>📅 이번 주 일정</h3>
              <a href="/calendar" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none', background: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>전체보기</a>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
              {thisWeekKeys.map(dayObj => {
                const daySchedules = scheduleData[dayObj.key] || [];
                const isToday = (dayObj.key === todayStr);
                let dateColor = '#1e293b';
                if (dayObj.dayIdx === 0) dateColor = '#ef4444';
                else if (dayObj.dayIdx === 6) dateColor = '#3b82f6';

                return (
                  <div key={dayObj.key} style={{ border: '1px solid #f1f5f9', borderRadius: '16px', padding: '10px', background: isToday ? '#f3e8ff' : '#ffffff', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: dateColor, marginBottom: '2px', textAlign: 'center' }}>
                      {dayObj.dateNum}
                    </div>
                    {daySchedules.map((sch: any, idx: number) => {
                      const bgColor = getEventColor(sch);
                      const txtColor = sch.textColor || (sch.extendedProps && sch.extendedProps.textColor) || 'white';
                      
                      return (
                        <div key={idx} style={{ borderRadius: '6px', padding: '6px', color: txtColor, fontSize: '12px', backgroundColor: bgColor, wordBreak: 'keep-all', overflowWrap: 'anywhere', lineHeight: '1.3' }}>
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
          </div>

          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>▶️ 몽튜브 최신 영상</div>
            {ytError ? (
              <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '14px', padding: '40px 0', background: 'white', borderRadius: '20px' }} dangerouslySetInnerHTML={{ __html: ytError }} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {ytVideos.map((item, idx) => {
                  const video = item.snippet;
                  const videoId = item.id.videoId || video.resourceId?.videoId;
                  const thumb = video.thumbnails?.medium?.url || '';
                  return (
                    <a key={idx} href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" style={{ background: '#ffffff', borderRadius: '20px', padding: '15px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                      <img src={thumb} alt="썸네일" style={{ width: '100%', aspectRatio: '16/9', background: '#f1f5f9', borderRadius: '12px', marginBottom: '15px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.4' }}>{video.title}</div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>🔗 몽나링크</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
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

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '650px', maxWidth: '90vh', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#a855f7', marginBottom: '20px' }}>⚙️ 홈페이지 설정</h2>
            
            <div style={{ marginBottom: '20px', background: '#fff0f0', padding: '15px', borderRadius: '12px' }}>
              <label style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={inputIsLive} onChange={e => setIsLive(e.target.checked)} />
                🚨 현재 방송중 배지 켜기
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📸 좌측 메인 사진 URL</label>
              <input type="text" value={inputHeroImg} onChange={e => setInputHeroImg(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>▶️ 유튜브 채널 ID</label>
              <input type="text" value={inputYtChannelId} onChange={e => setInputYtChannelId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔑 구글 공식 유튜브 API 키</label>
              <input type="text" value={inputYtApiKey} onChange={e => setInputYtApiKey(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
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
  );
}
