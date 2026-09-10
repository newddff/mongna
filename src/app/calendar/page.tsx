'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

export default function CalendarPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [memoList, setMemoList] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any>({});
  const [streamerDirectory, setStreamerDirectory] = useState<any>({});
  const [categoryColors, setCategoryColors] = useState({
    합방: "#4dabf7", 방송: "#ff9eb5", 휴방: "#9ca3af", 겜방: "#f59e0b", LCK: "#8b5cf6", 같이보기: "#20c997"
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;
  const [mobileSelectedDate, setMobileSelectedDate] = useState<string>(todayStr);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [viewTargetSchId, setViewTargetSchId] = useState<number | null>(null);

  const [inputTitle, setInputTitle] = useState('');
  const [inputTime, setInputTime] = useState('시간 미정');
  const [currentSchType, setCurrentSchType] = useState('방송');
  const [inputMembers, setInputMembers] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [inputVod, setInputVod] = useState('');

  const [viewModalData, setViewModalData] = useState<any>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isStreamerManagerOpen, setIsStreamerManagerOpen] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [memoInputText, setMemoInputText] = useState('');

  const [streamerResults, setStreamerResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newStreamerNick, setNewStreamerNick] = useState('');
  const [newStreamerId, setNewStreamerId] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const isCurrentMonth = todayObj.getFullYear() === selectedYear && (todayObj.getMonth() + 1) === selectedMonth;
    if (isCurrentMonth) setMobileSelectedDate(todayStr);
    else setMobileSelectedDate(`${selectedYear}-${selectedMonth}-1`);
  }, [selectedYear, selectedMonth]);

  const handleStreamerSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMembers(val);

    const terms = val.split(',').map(m => m.trim()).filter(m => m !== '');
    const currentTerm = terms[terms.length - 1] || '';

    if (val.endsWith(',')) {
      const targetKeyword = terms[terms.length - 1];
      if (!targetKeyword || targetKeyword.length < 1) {
        setStreamerResults([]);
        return;
      }

      const localMatch = Object.values(streamerDirectory).filter((s: any) => 
        s && typeof s === 'object' &&
        (String(s.name || '').toLowerCase() === targetKeyword.toLowerCase() || 
         String(s.userId || '').toLowerCase() === targetKeyword.toLowerCase())
      );

      if (localMatch.length > 0) {
        setStreamerResults(localMatch);
        return;
      }

      setIsSearching(true);
      setStreamerResults([]); 
      
      try {
        const res = await fetch(`/api/search-streamer?keyword=${encodeURIComponent(targetKeyword)}`);
        const data = await res.json();
        setStreamerResults(Array.isArray(data.streamers) ? data.streamers : []);
      } catch (err) {
        console.error("쉼표 입력 후 크롤링 에러:", err);
        setStreamerResults([]);
      } finally {
        setIsSearching(false); 
      }
      return;
    }

    if (currentTerm.length < 1) {
      setStreamerResults([]);
      return;
    }

    const localMatches = Object.values(streamerDirectory).filter((s: any) => 
      s && typeof s === 'object' &&
      (String(s.name || '').toLowerCase().includes(currentTerm.toLowerCase()) || 
       String(s.userId || '').toLowerCase().includes(currentTerm.toLowerCase()))
    );

    setStreamerResults(localMatches);
  };

  const handleSelectStreamer = async (selected: any) => {
    const terms = inputMembers.split(',').map(m => m.trim()).filter(m => m !== '');
    if (terms.length > 0) terms[terms.length - 1] = selected.name;
    else terms.push(selected.name);
    
    setInputMembers(terms.join(', ') + ', ');
    setStreamerResults([]); 

    const updatedDir = { ...streamerDirectory, [selected.name]: selected };
    setStreamerDirectory(updatedDir);

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'streamer_directory'), updatedDir, { merge: true });
  };

  const saveManualStreamer = async () => {
    if (!isAdmin) return;
    const nick = newStreamerNick.trim();
    const userId = newStreamerId.trim();
    if (!nick || !userId) {
      alert("닉네임과 영문 아이디를 모두 입력해주세요!");
      return;
    }

    const idLower = userId.toLowerCase();
    const prefix = idLower.substring(0, 2);
    const newEntry = {
      name: nick,
      userId: userId,
      profileImg: `https://profile.img.afreecatv.com/LOGO/${prefix}/${idLower}/${idLower}.jpg`,
      broadcastUrl: `https://www.sooplive.com/station/${userId}`
    };

    const updatedDir = { ...streamerDirectory, [nick]: newEntry };
    setStreamerDirectory(updatedDir);
    setNewStreamerNick('');
    setNewStreamerId('');

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'streamer_directory'), updatedDir, { merge: true });
    alert("스트리머가 명부에 성공적으로 등록되었습니다!");
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('mongna_calendar_admin') === 'true' || localStorage.getItem('mongna_home_admin') === 'true');
    }

    const firebaseConfig = {
      apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const sidebarRef = doc(db, 'mongna_calendar_data', 'sidebar_state');
    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');
    const colorsRef = doc(db, 'mongna_calendar_data', 'category_colors');
    const streamerDirRef = doc(db, 'mongna_calendar_data', 'streamer_directory');

    const unsubColors = onSnapshot(colorsRef, (docSnap) => {
      try { if (docSnap.exists()) setCategoryColors(prev => ({ ...prev, ...(docSnap.data() as any) })); } catch (e) { }
    });

    const unsubStreamerDir = onSnapshot(streamerDirRef, (docSnap) => {
      try { if (docSnap.exists()) setStreamerDirectory(docSnap.data() || {}); } catch (e) { }
    });

    const unsubSidebar = onSnapshot(sidebarRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSearchHistory(Array.isArray(data.searchHistory) ? data.searchHistory : []);
          setMemoList(Array.isArray(data.memoList) ? data.memoList : []);
        }
      } catch (e) { }
    });

    const unsubSchedule = onSnapshot(scheduleRef, async (docSnap) => {
      try {
        if (docSnap.exists() && Object.keys(docSnap.data().data || {}).length > 0) {
          setSchedules(docSnap.data().data);
        }
        setIsLoading(false);
      } catch (e) { }
    });

    return () => { unsubColors(); unsubSidebar(); unsubSchedule(); unsubStreamerDir(); };
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        if (typeof window !== 'undefined') { localStorage.removeItem('mongna_calendar_admin'); localStorage.removeItem('mongna_home_admin'); }
      }
    } else {
      const password = prompt("관리자 비밀번호를 입력해주세요.");
      if (password === "mongna1234") {
        setIsAdmin(true);
        if (typeof window !== 'undefined') { localStorage.setItem('mongna_calendar_admin', 'true'); localStorage.setItem('mongna_home_admin', 'true'); }
        alert("관리자 인증 성공!");
      } else if (password !== null) alert("비밀번호가 틀렸습니다.");
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(new Date(year, month, d));

  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth() + 1);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth() + 1);
  };

  const jumpToDate = (y: number, m: number) => {
    const newDate = new Date(y, m - 1, 1);
    setCurrentDate(newDate);
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  const openAddModal = (dateKey: string) => {
    if (!isAdmin) { alert("일정 추가는 관리자만 가능합니다."); return; }
    setIsEditMode(false);
    setSelectedDateKey(dateKey);
    setInputTitle(''); setInputTime('시간 미정'); setCurrentSchType('방송');
    setInputMembers(''); setInputContent(''); setInputVod(''); setStreamerResults([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (dateKeyArg: string, schIdArg: number) => {
    setViewModalData(null);
    setIsEditMode(true);
    setSelectedDateKey(dateKeyArg);
    setViewTargetSchId(schIdArg);

    // 💡 안전하게 데이터 가져오기
    const rawSchedules = schedules[dateKeyArg] || [];
    const daySchedules = (Array.isArray(rawSchedules) ? rawSchedules : Object.values(rawSchedules)).filter(Boolean);

    const target: any = daySchedules.find((s: any) => s && s.id === schIdArg);
    if (!target) return;

    setInputTitle(target.title || ''); setInputTime(target.time || '시간 미정'); setCurrentSchType(target.type || '방송');
    const memArr = Array.isArray(target.members) ? target.members : Object.values(target.members || {});
    setInputMembers(memArr.join(', '));
    setInputContent(target.content || ''); setInputVod(target.vodLink || ''); setStreamerResults([]);
    setIsAddModalOpen(true);
  };

  const saveSchedule = async () => {
    const title = inputTitle.trim();
    if (!title) { alert("일정 제목을 입력해주세요!"); return; }

    let members: string[] = [];
    if (currentSchType === '합방' && inputMembers.trim()) {
      members = inputMembers.split(',').map(m => m.trim()).filter(m => m !== '' && !m.startsWith('@') && m !== '_');
    }

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');

    const updatedSchedules = { ...schedules };
    
    // 💡 배열화 보장 (찌꺼기 방지)
    if (!updatedSchedules[selectedDateKey] || !Array.isArray(updatedSchedules[selectedDateKey])) {
      updatedSchedules[selectedDateKey] = Array.isArray(schedules[selectedDateKey]) ? [...schedules[selectedDateKey]] : Object.values(schedules[selectedDateKey] || {});
    }

    if (isEditMode) {
      updatedSchedules[selectedDateKey] = updatedSchedules[selectedDateKey].map((s: any) => {
        if (s && s.id === viewTargetSchId) return { ...s, title, time: inputTime, type: currentSchType, members, content: inputContent, vodLink: inputVod, backgroundColor: (categoryColors as any)[currentSchType] || '#fb819e' };
        return s;
      });
    } else {
      updatedSchedules[selectedDateKey].push({ id: Date.now(), title, time: inputTime, type: currentSchType, members, content: inputContent, vodLink: inputVod, backgroundColor: (categoryColors as any)[currentSchType] || '#fb819e' });
    }

    try { await setDoc(scheduleRef, { data: updatedSchedules }, { merge: true }); setIsAddModalOpen(false); } catch (e) { alert("일정 저장 중 오류가 발생했습니다."); }
  };

  const deleteSchedule = async (dateKeyArg: string, schIdArg: number) => {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');

      const updatedSchedules = { ...schedules };
      if (updatedSchedules[dateKeyArg]) {
        const rawArr = Array.isArray(updatedSchedules[dateKeyArg]) ? updatedSchedules[dateKeyArg] : Object.values(updatedSchedules[dateKeyArg]);
        updatedSchedules[dateKeyArg] = rawArr.filter((s: any) => s && s.id !== schIdArg);
      }

      try { await setDoc(scheduleRef, { data: updatedSchedules }, { merge: true }); setViewModalData(null); } catch (e) { alert("삭제 실패!"); }
    }
  };

  const searchGame = async (engine: 'steam' | 'google') => {
    if (!isAdmin) return alert("관리자만 검색 기록을 남길 수 있습니다.");
    const query = gameSearchQuery.trim();
    if (!query) { alert("게임 제목을 입력해주세요!"); return; }
    const link = engine === 'steam' ? `https://store.steampowered.com/search/?term=${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(query + ' 게임')}`;
    window.open(link, '_blank');

    const newHistory = [{ query, engine }, ...searchHistory.filter((h: any) => h && h.query !== query)].slice(0, 5);
    setSearchHistory(newHistory); setGameSearchQuery('');

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory: newHistory, memoList }, { merge: true });
  };

  const deleteHistory = async (index: number) => {
    if (!isAdmin) return;
    const newHistory = searchHistory.filter((_, i) => i !== index);
    setSearchHistory(newHistory);
    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory: newHistory, memoList }, { merge: true });
  };

  const dropGame = async (e: React.DragEvent, dateKey: string) => {
    if (!isAdmin) return;
    e.preventDefault(); e.currentTarget.style.backgroundColor = '#fff';
    const query = e.dataTransfer.getData("gameName"); const link = e.dataTransfer.getData("gameLink"); const index = e.dataTransfer.getData("gameIndex");

    if (query) {
      const newSch = { id: Date.now(), title: query, time: '오후 8:00', type: '겜방', members: [], content: `[GAME_LINK]${query}|${link}`, vodLink: '', backgroundColor: (categoryColors as any)['겜방'] || '#f59e0b' };
      const updatedSchedules = { ...schedules };
      
      if (!updatedSchedules[dateKey] || !Array.isArray(updatedSchedules[dateKey])) {
        updatedSchedules[dateKey] = Array.isArray(schedules[dateKey]) ? [...schedules[dateKey]] : Object.values(schedules[dateKey] || {});
      }
      updatedSchedules[dateKey].push(newSch);

      const newHistory = index !== "" ? searchHistory.filter((_, i) => i !== parseInt(index, 10)) : searchHistory;
      setSearchHistory(newHistory);

      const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      await setDoc(doc(db, 'mongna_calendar_data', 'schedule_data'), { data: updatedSchedules }, { merge: true });
      await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory: newHistory, memoList }, { merge: true });
      setViewModalData({ sch: newSch, dateKey });
    }
  };

  const saveMemo = async () => {
    if (!isAdmin) return alert("관리자만 작성할 수 있습니다.");
    const text = memoInputText.trim();
    if (!text) return alert("메모 내용을 입력해주세요!");
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newMemos = [{ date: dateStr, text }, ...memoList];
    setMemoList(newMemos); setMemoInputText('');

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory, memoList: newMemos }, { merge: true });
  };

  const deleteMemo = async (index: number) => {
    if (!isAdmin) return;
    const newMemos = memoList.filter((_, i) => i !== index);
    setMemoList(newMemos);
    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory: newMemos }, { merge: true });
  };

  const saveCategoryColors = async () => {
    if (!isAdmin) return;
    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'category_colors'), categoryColors, { merge: true });
    setIsColorModalOpen(false);
  };

  // 💡 Hydration 및 루트 충돌 방지: null 반환으로 완벽 차단
  if (!isMounted) return null;

  return (
    <>
      {/* 🟢 자동 모바일 뷰 감지 반응형 CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .nav-container { flex-direction: column !important; height: auto !important; padding: 15px 20px !important; gap: 15px; }
          .nav-links { flex-wrap: wrap !important; justify-content: center !important; font-size: 14px !important; gap: 15px !important; }
          .top-btn-group { width: 100%; justify-content: center; }
          .main-wrapper { padding: 20px 15px !important; border-radius: 20px !important; width: 100% !important; margin: 0 !important; }
          .flex-layout { flex-direction: column !important; gap: 30px !important; }
          .calendar-area, .sidebar-area { min-width: 100% !important; width: 100% !important; }
          .modal-box { width: 95% !important; padding: 25px 20px !important; }
        }
      `}} />

      <div style={{ backgroundColor: '#C1ACD7', color: '#333', minHeight: '100vh', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        
        {isLoading && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>캘린더를 불러오는 중입니다... 🌙</div>
          </div>
        )}

        <nav className="nav-container" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', maxWidth: '1400px', margin: '0 auto' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="몽나 로고" style={{ height: '40px', objectFit: 'contain' }} />
          </a>

          <div className="nav-links" style={{ display: 'flex', gap: '30px', fontWeight: 800, color: '#333', fontSize: '15px' }}>
            <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>홈</a>
            <a href="/wiki" style={{ textDecoration: 'none', color: 'inherit' }}>몽무위키</a>
            <a href="/calendar" style={{ textDecoration: 'none', color: '#8b5cf6', position: 'relative' }}>캘린더</a>
            <a href="/song.html" style={{ textDecoration: 'none', color: 'inherit' }}>노래책</a>
            <a href="/reward.html" style={{ textDecoration: 'none', color: 'inherit' }}>업보(보상)</a>
            <a href="/vod.html" style={{ textDecoration: 'none', color: 'inherit' }}>VOD</a>
          </div>

          <div className="top-btn-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => setIsStreamerManagerOpen(true)} style={{ padding: '8px 14px', borderRadius: '99px', border: '1px solid #e4dceb', background: '#fff', color: '#555', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }} title="스트리머 명부 관리">👥 스트리머 등록</button>
                <button onClick={() => setIsColorModalOpen(true)} style={{ width: '40px', height: '40px', borderRadius: '99px', border: '1px solid #e4dceb', background: '#fff', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="카테고리 색상 설정">⚙️</button>
              </div>
            )}
            <button onClick={toggleAdmin} style={{ padding: '8px 18px', borderRadius: '99px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: '1px solid transparent', background: isAdmin ? '#ffd700' : 'rgba(139, 92, 246, 0.1)', color: isAdmin ? '#333' : '#8b5cf6' }}>
              {isAdmin ? '👑 관리자 모드' : '🔒 관리자 로그인'}
            </button>
          </div>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '50px' }}>
          <div className="main-wrapper" style={{ backgroundColor: '#ffffff', width: '96vw', maxWidth: '1400px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)', padding: '50px', boxSizing: 'border-box' }}>
            <div className="flex-layout" style={{ display: 'flex', gap: '40px', flexDirection: 'row', flexWrap: 'wrap' }}>
              
              <div className="calendar-area" style={{ flex: 3, display: 'flex', flexDirection: 'column', minWidth: '300px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', marginBottom: '35px' }}>
                  <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#333', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.2)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>◀</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f0fa', border: '2px solid #e4dceb', borderRadius: '99px', padding: '8px 25px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <select value={selectedYear} onChange={(e) => jumpToDate(parseInt(e.target.value), selectedMonth)} style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, color: '#4a3b5c', cursor: 'pointer', outline: 'none' }}>
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#6b5b7d' }}>년</span>
                    <select value={selectedMonth} onChange={(e) => jumpToDate(selectedYear, parseInt(e.target.value))} style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, color: '#4a3b5c', cursor: 'pointer', outline: 'none' }}>
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                    </select>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#6b5b7d' }}>월</span>
                  </div>
                  <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#333', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.2)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>▶</button>
                </div>

                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', marginBottom: '15px', fontSize: '14px' }}>
                        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                          <div key={d} style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#94a3b8' }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {calendarDays.map((dateObj, idx) => {
                          if (!dateObj) return <div key={idx} />;
                          const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
                          
                          // 💡 100% 에러 방지 (null 객체 완벽 필터링)
                          const rawSchedules = schedules[dateKey] || [];
                          const daySchedules = (Array.isArray(rawSchedules) ? rawSchedules : Object.values(rawSchedules))
                            .filter((sch: any) => sch && typeof sch === 'object');
                          
                          const isToday = (dateKey === todayStr);
                          const isSelected = (dateKey === mobileSelectedDate);
                          const dayOfWeek = dateObj.getDay();
                          
                          let numColor = '#1e293b';
                          if (dayOfWeek === 0) numColor = '#ef4444';
                          if (dayOfWeek === 6) numColor = '#3b82f6';
                          if (isSelected) numColor = '#ffffff';

                          return (
                            <div 
                              key={idx} 
                              onClick={() => setMobileSelectedDate(dateKey)}
                              style={{
                                aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: isSelected ? '#a855f7' : isToday ? '#f3e8ff' : '#f8fafc',
                                borderRadius: '14px', cursor: 'pointer', position: 'relative',
                                border: isToday && !isSelected ? '2px solid #d8b4fe' : '2px solid transparent',
                                transition: '0.2s'
                              }}
                            >
                              <span style={{ fontSize: '15px', fontWeight: isSelected || isToday ? 900 : 700, color: numColor }}>
                                {dateObj.getDate()}
                              </span>
                              {daySchedules.length > 0 && (
                                <div style={{ display: 'flex', gap: '3px', position: 'absolute', bottom: '6px' }}>
                                  {daySchedules.slice(0,3).map((sch: any, sIdx: number) => (
                                    <div key={sIdx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#fff' : (sch.backgroundColor || (categoryColors as any)[sch.type || ''] || '#fb819e') }} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                         <div style={{ fontSize: '18px', fontWeight: 900, color: '#333' }}>
                           {mobileSelectedDate.split('-')[1]}월 {mobileSelectedDate.split('-')[2]}일 일정
                         </div>
                         {isAdmin && (
                           <button onClick={() => openAddModal(mobileSelectedDate)} style={{ background: '#f3e8ff', border: 'none', padding: '8px 16px', borderRadius: '99px', fontSize: '13px', fontWeight: 'bold', color: '#a855f7' }}>
                             + 일정 추가
                           </button>
                         )}
                       </div>
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(() => {
                            // 💡 100% 에러 방지 필터링
                            const rawSelectedSchedules = schedules[mobileSelectedDate] || [];
                            const selectedSchedules = (Array.isArray(rawSelectedSchedules) ? rawSelectedSchedules : Object.values(rawSelectedSchedules))
                              .filter((sch: any) => sch && typeof sch === 'object');
                            
                            if (selectedSchedules.length === 0) {
                              return <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>선택된 날짜에 일정이 없습니다.</div>;
                            }
                            return selectedSchedules.map((sch: any, sIdx: number) => {
                              const bg = sch.backgroundColor || (categoryColors as any)[sch.type || ''] || '#fb819e';
                              const safeTitle = typeof sch.title === 'string' ? sch.title : String(sch.title || '제목 없음');
                              const safeTime = sch.time ? String(sch.time) : '';

                              return (
                                <div key={sIdx} onClick={() => setViewModalData({ sch, dateKey: mobileSelectedDate })} style={{ background: bg, color: '#fff', padding: '16px', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                  {safeTime && safeTime !== '시간 미정' && <span style={{ fontSize: '12px', background: 'rgba(0,0,0,0.15)', alignSelf: 'flex-start', padding: '4px 8px', borderRadius: '8px' }}>⏰ {safeTime}</span>}
                                  <span>{safeTitle}</span>
                                </div>
                              );
                            });
                          })()}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#fff', textAlign: 'center', fontWeight: 'bold', minWidth: '700px', marginBottom: '15px' }}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div key={day} style={{ padding: '14px 0', border: '2px dashed #dcd0ec', borderRadius: '16px', margin: '0 4px', color: idx === 0 ? '#ff6b6b' : idx === 6 ? '#4dabf7' : '#4a3b5c', backgroundColor: '#fcfbfe', fontSize: '15px', fontWeight: 900 }}>{day}</div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', minWidth: '700px' }}>
                      {calendarDays.map((dateObj, idx) => {
                        if (!dateObj) {
                          return <div key={idx} style={{ minHeight: '130px', backgroundColor: 'transparent' }} />;
                        }

                        const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
                        
                        // 💡 100% 에러 방지 (null 객체 완벽 필터링)
                        const rawSchedules = schedules[dateKey] || [];
                        const daySchedules = (Array.isArray(rawSchedules) ? rawSchedules : Object.values(rawSchedules))
                          .filter((sch: any) => sch && typeof sch === 'object');
                        
                        const isToday = (dateObj.getFullYear() === today.getFullYear() && dateObj.getMonth() === today.getMonth() && dateObj.getDate() === today.getDate());
                        const dayOfWeek = dateObj.getDay();

                        let numColor = '#333';
                        if (dayOfWeek === 0) numColor = '#ff6b6b';
                        if (dayOfWeek === 6) numColor = '#4dabf7';

                        return (
                          <div 
                            key={idx}
                            onDoubleClick={() => openAddModal(dateKey)}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f3e8ff'; }}
                            onDragLeave={(e) => { e.currentTarget.style.backgroundColor = isToday ? '#f3e8ff' : '#ffffff'; }}
                            onDrop={(e) => dropGame(e, dateKey)}
                            style={{
                              minHeight: '130px', padding: '10px', 
                              border: isToday ? '2px solid #a855f7' : '1px solid #f1f3f5', 
                              borderRadius: '20px',
                              backgroundColor: isToday ? '#f3e8ff' : '#ffffff', 
                              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                              display: 'flex', flexDirection: 'column',
                              cursor: isAdmin ? 'pointer' : 'default', overflow: 'hidden', transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ fontSize: '15px', fontWeight: 900, color: numColor, marginBottom: '6px' }}>{dateObj.getDate()}</span>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {daySchedules.map((sch: any, sIdx: number) => {
                                const bg = sch.backgroundColor || (categoryColors as any)[sch.type || ''] || '#fb819e';
                                const safeTitle = typeof sch.title === 'string' ? sch.title : String(sch.title || '제목 없음');
                                const safeTime = sch.time ? String(sch.time) : '';

                                return (
                                  <div 
                                    key={sch.id || sIdx}
                                    onClick={(e) => { e.stopPropagation(); setViewModalData({ sch, dateKey }); }}
                                    style={{ 
                                      fontSize: '11px', padding: '6px 8px', borderRadius: '8px', fontWeight: 700, boxShadow: '0 2px 5px rgba(0,0,0,0.08)', cursor: 'pointer', lineHeight: '1.35', overflow: 'hidden', textAlign: 'left',
                                      backgroundColor: bg, color: '#fff'
                                    }}
                                  >
                                    {safeTime && safeTime !== '시간 미정' && (
                                      <span style={{ display: 'inline-block', opacity: 0.95, marginBottom: '3px', fontSize: '0.85em', fontWeight: 800, background: 'rgba(0,0,0,0.15)', padding: '2px 5px', borderRadius: '4px' }}>[{safeTime}]</span>
                                    )}
                                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{safeTitle}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 오른쪽 사이드바 영역 */}
              <div className="sidebar-area" style={{ flex: 1, backgroundColor: '#fcfbfe', borderRadius: '24px', padding: '30px 25px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '25px', height: 'fit-content', minWidth: '280px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#4a3b5c', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>🎮 종겜 링크 찾기</h2>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                      <input type="text" value={gameSearchQuery} onChange={(e) => setGameSearchQuery(e.target.value)} placeholder="" onKeyPress={(e) => { if(e.key==='Enter') searchGame('steam'); }} style={{ padding: '12px 14px', border: '1px solid #e4dceb', borderRadius: '14px', outline: 'none', fontSize: '14px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', backgroundColor: '#fff' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => searchGame('steam')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#1b2838', color: 'white', fontSize: '13px' }}>Steam 검색</button>
                        <button onClick={() => searchGame('google')} style={{ flex: 1, padding: '10px', border: '1px solid #e4dceb', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#fff', color: '#333', fontSize: '13px' }}>Google 검색</button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {searchHistory.map((h: any, index: number) => {
                      if (!h || !h.query) return null;
                      const link = h.engine === 'steam' ? 'https://store.steampowered.com/search/?term=' + encodeURIComponent(h.query) : 'https://www.google.com/search?q=' + encodeURIComponent(h.query + ' 게임');
                      return (
                        <div key={index} draggable={isAdmin} onDragStart={(e) => { e.dataTransfer.setData("gameName", h.query); e.dataTransfer.setData("gameLink", link); e.dataTransfer.setData("gameIndex", index.toString()); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #eee', fontSize: '13px', fontWeight: 500, cursor: isAdmin ? 'grab' : 'default', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                          <a href={link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.engine === 'steam' ? '💨' : '🔍'} {h.query}</a>
                          {isAdmin && <button onClick={() => deleteHistory(index)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✕</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px dashed #e4dceb', margin: '5px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#4a3b5c', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>📝 몽나 메모장</h2>
                  </div>
                  {isAdmin && (
                    <div>
                      <textarea value={memoInputText} onChange={(e) => setMemoInputText(e.target.value)} placeholder="" style={{ width: '100%', height: '100px', padding: '12px', border: '1px solid #e4dceb', borderRadius: '14px', outline: 'none', fontSize: '14px', resize: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}></textarea>
                      <button onClick={saveMemo} style={{ marginTop: '10px', width: '100%', padding: '12px', backgroundColor: '#C1ACD7', color: '#fff', fontWeight: 900, border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(193, 172, 215, 0.4)' }}>메모 저장하기</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginTop: '12px' }}>
                    {memoList.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', fontSize: '12px', padding: '15px 0' }}>작성된 메모가 없습니다.</div>}
                    {memoList.map((memo: any, index: number) => {
                      if (!memo || !memo.text) return null;
                      return (
                        <div key={index} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '14px', padding: '14px', position: 'relative', fontSize: '13px', lineHeight: '1.4', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                          {isAdmin && <button onClick={() => deleteMemo(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✕</button>}
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{memo.date}</div>
                          <div style={{ color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{memo.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ---------------- 모달 창들은 기존과 100% 동일하게 유지 ---------------- */}
        {isAddModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsAddModalOpen(false)}>
            <div className="modal-box" style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', width: '560px', maxWidth: '90vw', padding: '35px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', background: '#f3e8ff', color: '#7c3aed', padding: '6px 14px', borderRadius: '10px', fontSize: '14px' }}>{selectedDateKey} 일정 등록</span>
                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>일정 제목</label>
                <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="" style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>⏰ 방송 시간 선택</label>
                <select value={inputTime} onChange={(e) => setInputTime(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', outline: 'none', backgroundColor: '#fff' }}>
                  <option value="시간 미정">시간 미정</option>
                  {Array.from({length: 24}).map((_, i) => {
                    const ampm = i < 12 ? '오전' : '오후';
                    const hour = i % 12 === 0 ? 12 : i % 12;
                    return (
                      <React.Fragment key={i}>
                        <option value={`${ampm} ${hour}:00`}>{ampm} {hour}:00</option>
                        <option value={`${ampm} ${hour}:30`}>{ampm} {hour}:30</option>
                      </React.Fragment>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>방송 분류</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {['합방', '방송', '휴방', '겜방', 'LCK', '같이보기'].map((type) => (
                    <button 
                      key={type} type="button" onClick={() => setCurrentSchType(type)} 
                      style={{ border: 'none', padding: '12px 0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', backgroundColor: currentSchType === type ? (categoryColors as any)[type] || '#8b5cf6' : '#f2f2f2', color: currentSchType === type ? '#fff' : '#777', boxShadow: currentSchType === type ? '0 4px 10px rgba(0,0,0,0.15)' : 'none' }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {currentSchType === '합방' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>참여자 닉네임</label>
                  <input type="text" value={inputMembers} onChange={handleStreamerSearch} placeholder="" style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', width: '100%' }} />

                  {(isSearching || streamerResults.length > 0) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', marginTop: '4px', zIndex: 1100, maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                      {isSearching ? (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#8b5cf6', fontSize: '13px', fontWeight: 'bold' }}>🔍 숲(SOOP)에서 정보를 찾는 중입니다...</div>
                      ) : (
                        streamerResults.map((s, idx) => (
                          <div key={idx} onClick={() => handleSelectStreamer(s)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                            <img src={s.profileImg} alt="프사" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} onError={(e: any)=>{e.target.style.display='none'}} />
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{s.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>@{s.userId}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>상세 내용 (선택)</label>
                <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="" style={{ height: '80px', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', resize: 'none', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>📺 VOD (다시보기) 링크</label>
                <input type="text" value={inputVod} onChange={(e) => setInputVod(e.target.value)} placeholder="" style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', outline: 'none' }} />
              </div>

              <button onClick={saveSchedule} style={{ backgroundColor: '#ff7676', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', boxShadow: '0 4px 15px rgba(255, 118, 118, 0.4)' }}>
                {isEditMode ? '일정 수정 완료' : '일정 등록하기'}
              </button>
            </div>
          </div>
        )}

        {isStreamerManagerOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsStreamerManagerOpen(false)}>
            <div className="modal-box" style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', width: '480px', maxWidth: '90vw', padding: '35px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', background: '#f3e8ff', color: '#7c3aed', padding: '6px 14px', borderRadius: '10px', fontSize: '14px' }}>👥 스트리머 명부 직접 등록</span>
                <button onClick={() => setIsStreamerManagerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>스트리머 한글 닉네임</label>
                <input type="text" value={newStreamerNick} onChange={(e) => setNewStreamerNick(e.target.value)} placeholder="" style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>숲(SOOP) 영문 아이디</label>
                <input type="text" value={newStreamerId} onChange={(e) => setNewStreamerId(e.target.value)} placeholder="" style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', outline: 'none' }} />
              </div>

              <button onClick={saveManualStreamer} style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
                명부에 저장하기
              </button>
            </div>
          </div>
        )}

        {viewModalData && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setViewModalData(null)}>
            <div className="modal-box" style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', width: '500px', maxWidth: '90vw', padding: '40px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '25px' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewModalData(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}>✕</button>
              
              <h2 style={{ margin: 0, fontSize: '28px', color: '#222' }}>{viewModalData.sch.title}</h2>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {viewModalData.sch.time && viewModalData.sch.time !== '시간 미정' && (
                  <span style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', backgroundColor: '#fbc531', color: 'white' }}>{viewModalData.sch.time}</span>
                )}
                <span className={`type-${viewModalData.sch.type}`} style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px' }}>{viewModalData.sch.type}</span>
              </div>

              {viewModalData.sch.type === '합방' && viewModalData.sch.members && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {(() => {
                    const rawMembers = viewModalData.sch.members;
                    const memberList = Array.isArray(rawMembers) ? rawMembers : Object.values(rawMembers);

                    return memberList.map((name: any, idx: number) => {
                      const trimmedName = String(name || '').trim();
                      if (!trimmedName || trimmedName === '_') return null;

                      const matched = streamerDirectory[trimmedName] || { 
                        name: trimmedName, 
                        userId: trimmedName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        profileImg: `https://profile.img.afreecatv.com/LOGO/${trimmedName.substring(0,2).toLowerCase()}/${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}/${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}.jpg`,
                        broadcastUrl: `https://www.sooplive.com/station/${trimmedName}`
                      };

                      return (
                        <a key={idx} href={matched.broadcastUrl} target="_blank" rel="noreferrer" title={`${matched.name} 방송국 바로가기`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', transition: '0.2s' }} onMouseOver={(e)=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={(e)=>e.currentTarget.style.transform='scale(1)'}>
                          <img src={matched.profileImg} alt={matched.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C1ACD7', background: '#ddd', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} onError={(e: any) => { e.target.src = `https://via.placeholder.com/56/C1ACD7/ffffff?text=${encodeURIComponent(matched.name.charAt(0))}`; }} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{matched.name}</span>
                        </a>
                      );
                    });
                  })()}
                </div>
              )}

              {viewModalData.sch.content && (
                <div style={{ width: '100%' }}>
                  {viewModalData.sch.content.startsWith('[GAME_LINK]') ? (
                    (() => {
                      const parts = viewModalData.sch.content.replace('[GAME_LINK]', '').split('|');
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', backgroundColor: '#f8f9fa', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
                          <a href={parts[1] || '#'} target="_blank" rel="noreferrer" style={{ backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', fontWeight: 'bold', textDecoration: 'none' }}>🎮 {parts[0]}</a>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ marginTop: '10px', fontSize: '15px', color: '#555', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', width: '100%', boxSizing: 'border-box', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                      {viewModalData.sch.content}
                    </div>
                  )}
                </div>
              )}

              {viewModalData.sch.vodLink && (
                <a href={viewModalData.sch.vodLink.startsWith('http') ? viewModalData.sch.vodLink : `https://${viewModalData.sch.vodLink}`} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', textAlign: 'center', backgroundColor: '#ff4757', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', textDecoration: 'none', boxSizing: 'border-box' }}>📺 다시보기 시청</a>
              )}

              {isAdmin && (
                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                  <button onClick={() => openEditModal(viewModalData.dateKey, viewModalData.sch.id)} style={{ flex: 1, background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', padding: '10px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>이 일정 수정하기</button>
                  <button onClick={() => deleteSchedule(viewModalData.dateKey, viewModalData.sch.id)} style={{ flex: 1, background: 'none', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '10px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>이 일정 삭제하기</button>
                </div>
              )}
            </div>
          </div>
        )}

        {isColorModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsColorModalOpen(false)}>
            <div className="modal-box" style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', width: '520px', maxWidth: '90vw', padding: '32px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '8px', fontSize: '14px' }}>🎨 카테고리 색상 설정</span>
                <button onClick={() => setIsColorModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}>✕</button>
              </div>

              {Object.keys(categoryColors).map((cat) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                  <label style={{ fontSize: '15px', fontWeight: 'bold', color: (categoryColors as any)[cat] }}>{cat} 색상</label>
                  <input type="color" value={(categoryColors as any)[cat]} onChange={(e) => setCategoryColors({ ...categoryColors, [cat]: e.target.value })} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2px', cursor: 'pointer', background: '#fff', width: '60px', height: '35px' }} />
                </div>
              ))}

              <button onClick={saveCategoryColors} style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>색상 저장 적용하기</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
