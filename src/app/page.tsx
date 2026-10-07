'use client';

import React, { useEffect, useState } from 'react';
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
  const todayStr = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;   const currentDay = todayObj.getDay();   const sunday = new Date(todayObj.getTime());   sunday.setDate(todayObj.getDate() - currentDay);    const thisWeekKeys = [];   const dayNames = ['일', '월', '화', '수', '목', '금', '토'];   for (let i = 0; i < 7; i++) {     const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);     thisWeekKeys.push({       key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
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
          100% { box-shadow: 0 0 0 0 rgba(23
