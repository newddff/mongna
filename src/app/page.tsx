'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// 주요 스트리머 방송국 ID 매핑 (여기에 없는 스트리머는 닉네임을 그대로 방송국 ID로 자동 인식합니다)
const streamerStationMap: { [key: string]: string } = {
  "몽나": "pinktape8",
  "다룽": "daarung22",
  "최또": "chwitto",
  "카푸": "kapu",
  "달묘": "dalmyo",
  "츄르": "churu",
  "콧시": "kossi",
  "감치치": "gamchichi",
  "달푸": "dalpu",
  "몽또": "mongtto",
  "달타": "dalta"
};

export default function CalendarPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [memoList, setMemoList] = useState<any[]>([]);
  const [categoryColors, setCategoryColors] = useState({
    합방: "#4dabf7",
    방송: "#ff9eb5",
    휴방: "#9ca3af",
    겜방: "#f59e0b",
    LCK: "#8b5cf6",
    같이보기: "#20c997"
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태들
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [editSchId, setEditSchId] = useState<number | null>(null);

  const [inputTitle, setInputTitle] = useState('');
  const [inputTime, setInputTime] = useState('오후 8:00');
  const [inputType, setInputType] = useState('방송');
  const [inputMembers, setInputMembers] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [inputVod, setInputVod] = useState('');

  const [viewModalItem, setViewModalItem] = useState<any>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [memoInputText, setMemoInputText] = useState('');

  // Firebase 초기화 및 데이터 구독
  useEffect(() => {
    setIsAdmin(localStorage.getItem('mongna_home_admin') === 'true' || localStorage.getItem('mongna_calendar_admin') === 'true');

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

    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');
    const sidebarRef = doc(db, 'mongna_calendar_data', 'sidebar_state');
    const colorsRef = doc(db, 'mongna_calendar_data', 'category_colors');

    const unsubSchedule = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists()) {
        setScheduleData(docSnap.data().data || {});
      }
      setIsLoading(false);
    });

    const unsubSidebar = onSnapshot(sidebarRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSearchHistory(Array.isArray(data.searchHistory) ? data.searchHistory : []);
        setMemoList(Array.isArray(data.memoList) ? data.memoList : []);
      }
    });

    const unsubColors = onSnapshot(colorsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setCategoryColors(prev => ({ ...prev, ...data }));
      }
    });

    return () => {
      unsubSchedule();
      unsubSidebar();
      unsubColors();
    };
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        localStorage.removeItem('mongna_home_admin');
        localStorage.removeItem('mongna_calendar_admin');
      }
    } else {
      const pwd = prompt("관리자 비밀번호 입력:");
      if (pwd === "mongna1234") {
        setIsAdmin(true);
        localStorage.setItem('mongna_home_admin', 'true');
        localStorage.setItem('mongna_calendar_admin', 'true');
        alert("관리자 인증 성공!");
      } else if (pwd) {
        alert("비밀번호 오류");
      }
    }
  };

  // 연/월 빠른 이동
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= lastDay; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, parseInt(e.target.value, 10) - 1, 1));
  };

  // 일정 추가 모달 열기
  const handleDateClick = (dateObj: Date) => {
    if (!isAdmin) return;
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
    setSelectedDateKey(key);
    setIsEditMode(false);
    setEditSchId(null);
    setInputTitle('');
    setInputTime('오후 8:00');
    setInputType('방송');
    setInputMembers('');
    setInputContent('');
    setInputVod('');
    setIsAddModalOpen(true);
  };

  // 일정 수정 모달 열기
  const openEditModal = (sch: any, dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsEditMode(true);
    setEditSchId(sch.id);
    setInputTitle(sch.title || '');
    setInputTime(sch.time || '오후 8:00');
    setInputType(sch.type || '방송');
    setInputMembers(sch.members ? sch.members.join(', ') : '');
    setInputContent(sch.content || '');
    setInputVod(sch.vodLink || '');
    setViewModalItem(null);
    setIsAddModalOpen(true);
  };

  // 일정 저장 (추가/수정)
  const saveSchedule = async () => {
    if (!inputTitle.trim()) {
      alert("일정 제목을 입력해주세요!");
      return;
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
    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');

    const updatedData = { ...scheduleData };
    if (!updatedData[selectedDateKey]) {
      updatedData[selectedDateKey] = [];
    }

    let membersArr: string[] = [];
    if (inputType === '합방' && inputMembers.trim()) {
      membersArr = inputMembers.split(',').map(m => m.trim()).filter(m => m !== '');
    }

    const colorVal = (categoryColors as any)[inputType] || '#fb819e';

    if (isEditMode && editSchId !== null) {
      updatedData[selectedDateKey] = updatedData[selectedDateKey].map((s: any) => {
        if (s.id === editSchId) {
          return {
            ...s,
            title: inputTitle.trim(),
            time: inputTime.trim(),
            type: inputType,
            members: membersArr,
            content: inputContent,
            vodLink: inputVod.trim(),
            backgroundColor: colorVal,
            color: colorVal
          };
        }
        return s;
      });
    } else {
      updatedData[selectedDateKey].push({
        id: Date.now(),
        title: inputTitle.trim(),
        time: inputTime.trim(),
        type: inputType,
        members: membersArr,
        content: inputContent,
        vodLink: inputVod.trim(),
        backgroundColor: colorVal,
        color: colorVal
      });
    }

    try {
      await setDoc(scheduleRef, { data: updatedData }, { merge: true });
      setIsAddModalOpen(false);
      alert("일정이 저장되었습니다!");
    } catch (e) {
      alert("저장 실패!");
    }
  };

  // 일정 삭제
  const deleteSchedule = async (dateKey: string, schId: number) => {
    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) return;

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
    const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');

    const updatedData = { ...scheduleData };
    if (updatedData[dateKey]) {
      updatedData[dateKey] = updatedData[dateKey].filter((s: any) => s.id !== schId);
      if (updatedData[dateKey].length === 0) {
        delete updatedData[dateKey];
      }
    }

    try {
      await setDoc(scheduleRef, { data: updatedData }, { merge: true });
      setViewModalItem(null);
    } catch (e) {
      alert("삭제 실패!");
    }
  };

  // 종겜 검색 및 드래그 앤 드랍
  const searchGame = async (engine: 'steam' | 'google') => {
    if (!isAdmin) return alert("관리자만 검색할 수 있습니다.");
    const query = gameSearchQuery.trim();
    if (!query) {
      alert("게임 제목을 입력해주세요!");
      return;
    }
    const link = engine === 'steam' 
      ? `https://store.steampowered.com/search/?term=${encodeURIComponent(query)}` 
      : `https://www.google.com/search?q=${encodeURIComponent(query + ' 게임')}`;
    
    window.open(link, '_blank');

    const newHistory = [{ query, engine }, ...searchHistory.filter(h => h.query !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    setGameSearchQuery('');

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

  const handleDropGame = async (e: React.DragEvent, dateKey: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.currentTarget.style.background = '#fff';
    const q = e.dataTransfer.getData("gameQuery");
    const link = e.dataTransfer.getData("gameLink");
    if (!q) return;

    const updatedData = { ...scheduleData };
    if (!updatedData[dateKey]) updatedData[dateKey] = [];
    
    const newSch = {
      id: Date.now(),
      title: q,
      time: '오후 8:00',
      type: '겜방',
      members: [],
      content: `[GAME_LINK]${q}|${link}`,
      vodLink: '',
      backgroundColor: categoryColors.겜방,
      color: categoryColors.겜방
    };
    updatedData[dateKey].push(newSch);

    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'schedule_data'), { data: updatedData }, { merge: true });
    setViewModalItem({ sch: newSch, dateKey });
  };

  // 메모장
  const saveMemo = async () => {
    if (!isAdmin) return;
    const text = memoInputText.trim();
    if (!text) {
      alert("메모 내용을 입력해주세요!");
      return;
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newMemos = [{ date: dateStr, text }, ...memoList];
    setMemoList(newMemos);
    setMemoInputText('');

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
    await setDoc(doc(db, 'mongna_calendar_data', 'sidebar_state'), { searchHistory, memoList: newMemos }, { merge: true });
  };

  // 카테고리 색상 저장
  const saveCategoryColors = async () => {
    if (!isAdmin) return;
    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    await setDoc(doc(db, 'mongna_calendar_data', 'category_colors'), categoryColors, { merge: true });
    setIsColorModalOpen(false);
    alert("카테고리 색상이 저장되었습니다!");
  };

  return (
    <div style={{ backgroundColor: '#C1ACD7', color: '#333', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>캘린더를 불러오는 중입니다... 🌙</div>
        </div>
      )}

      {/* 상단 네비게이션 바 */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="몽나 로고" style={{ height: '40px', objectFit: 'contain' }} />
          </a>

          <div style={{ display: 'flex', gap: '30px', fontWeight: 800, fontSize: '15px' }}>
            <a href="/" style={{ textDecoration: 'none', color: '#333' }}>홈</a>
            <a href="/calender" style={{ textDecoration: 'none', color: '#8b5cf6', borderBottom: '3px solid #8b5cf6', paddingBottom: '4px' }}>캘린더</a>
            <a href="/song.html" style={{ textDecoration: 'none', color: '#333' }}>노래책</a>
            <a href="/reward.html" style={{ textDecoration: 'none', color: '#333' }}>업보(보상)</a>
            <a href="/vod.html" style={{ textDecoration: 'none', color: '#333' }}>VOD</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <button onClick={() => setIsColorModalOpen(true)} style={{ width: '40px', height: '40px', borderRadius: '99px', border: '1px solid #e4dceb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }} title="카테고리 색상 설정">⚙️</button>
            )}
            <button onClick={toggleAdmin} style={{ padding: '8px 18px', borderRadius: '99px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: '1px solid transparent', background: isAdmin ? '#ffd700' : 'rgba(139, 92, 246, 0.1)', color: isAdmin ? '#333' : '#8b5cf6' }}>
              {isAdmin ? '👑 관리자 모드' : '🔒 관리자 로그인'}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#ffffff', width: '96vw', maxWidth: '1400px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '40px', boxSizing: 'border-box', marginBottom: '40px' }}>
          
          <div style={{ display: 'flex', gap: '40px', flexDirection: 'row', flexWrap: 'wrap' }}>
            
            {/* 왼쪽: 캘린더 영역 */}
            <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minWidth: '300px' }}>
              
              {/* 년/월 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', marginBottom: '30px' }}>
                <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>◀</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={year} onChange={handleYearChange} style={{ background: '#f8f6fb', border: '1px solid #e4dceb', borderRadius: '12px', padding: '8px 20px', fontSize: '24px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>년</span>
                  <select value={month + 1} onChange={handleMonthChange} style={{ background: '#f8f6fb', border: '1px solid #e4dceb', borderRadius: '12px', padding: '8px 20px', fontSize: '24px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                  </select>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>월</span>
                </div>
                <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>▶</button>
              </div>

              {/* 달력 그리드 */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#fafafa', textAlign: 'center', fontWeight: 'bold', minWidth: '700px', borderTop: '1px solid #ddd', borderLeft: '1px solid #ddd' }}>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', color: '#ff6b6b' }}>일</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>월</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>화</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>수</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>목</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>금</div>
                  <div style={{ padding: '15px 0', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', color: '#4dabf7' }}>토</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: '700px', borderLeft: '1px solid #ddd' }}>
                  {calendarDays.map((dateObj, idx) => {
                    if (!dateObj) {
                      return <div key={idx} style={{ minHeight: '120px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', background: '#fff' }} />;
                    }

                    const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
                    const daySchedules = scheduleData[key] || [];
                    const todayStr = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
                    const isToday = (key === todayStr);
                    const dayOfWeek = dateObj.getDay();

                    let numColor = '#333';
                    if (dayOfWeek === 0) numColor = '#ff6b6b';
                    else if (dayOfWeek === 6) numColor = '#4dabf7';

                    return (
                      <div 
                        key={idx}
                        onDoubleClick={() => handleDateClick(dateObj)}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = '#f0f4ff'; }}
                        onDragLeave={(e) => { e.currentTarget.style.background = isToday ? 'rgba(193, 172, 215, 0.2)' : '#fff'; }}
                        onDrop={(e) => handleDropGame(e, key)}
                        style={{
                          minHeight: '120px', padding: '8px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd',
                          backgroundColor: isToday ? 'rgba(193, 172, 215, 0.2)' : '#fff', display: 'flex', flexDirection: 'column',
                          cursor: isAdmin ? 'pointer' : 'default', position: 'relative', overflow: 'hidden'
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: numColor, marginBottom: '5px' }}>
                          {dateObj.getDate()}
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                          {daySchedules.map((sch: any) => {
                            const bg = sch.backgroundColor || (categoryColors as any)[sch.type] || '#fb819e';
                            return (
                              <div
                                key={sch.id}
                                onClick={(e) => { e.stopPropagation(); setViewModalItem({ sch, dateKey: key }); }}
                                style={{
                                  backgroundColor: bg, color: '#fff', fontSize: '11px', padding: '6px', borderRadius: '6px',
                                  fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden'
                                }}
                              >
                                {sch.time && sch.time !== '시간 미정' && (
                                  <div style={{ display: 'inline-block', opacity: 0.95, marginBottom: '2px', fontSize: '0.85em', background: 'rgba(0,0,0,0.15)', padding: '2px 4px', borderRadius: '4px' }}>
                                    [{sch.time}]
                                  </div>
                                )}
                                <div>{sch.title}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 오른쪽: 사이드바 (종겜 링크 찾기 & 메모장) */}
            <div style={{ flex: 1, backgroundColor: '#faf8f5', borderRadius: '20px', padding: '30px 25px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '25px', height: 'fit-content', minWidth: '280px' }}>
              
              {/* 종겜 링크 찾기 */}
              <div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#5d4037' }}>🎮 종겜 링크 찾기</h2>
                {isAdmin ? (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                      <input 
                        type="text" 
                        value={gameSearchQuery} 
                        onChange={(e) => setGameSearchQuery(e.target.value)} 
                        placeholder="게임 이름 입력 (예: 팰월드)" 
                        onKeyPress={(e) => { if(e.key === 'Enter') searchGame('steam'); }}
                        style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: '12px', outline: 'none', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => searchGame('steam')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', background: '#1b2838', color: '#fff', fontSize: '13px' }}>Steam 검색</button>
                        <button onClick={() => searchGame('google')} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', background: '#fff', color: '#333', fontSize: '13px' }}>Google 검색</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', margin: '0 0 10px 0' }}>* 검색 기록을 드래그해서 캘린더 날짜에 놓아보세요!</p>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888' }}>관리자 로그인 시 종겜 검색 및 드래그 앤 드랍이 가능합니다.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchHistory.map((h, i) => {
                    const link = h.engine === 'steam' ? `https://store.steampowered.com/search/?term=${encodeURIComponent(h.query)}` : `https://www.google.com/search?q=${encodeURIComponent(h.query + ' 게임')}`;
                    return (
                      <div 
                        key={i} 
                        draggable={isAdmin}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("gameQuery", h.query);
                          e.dataTransfer.setData("gameLink", link);
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '13px', cursor: isAdmin ? 'grab' : 'default' }}
                      >
                        <a href={link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.engine === 'steam' ? '💨' : '🔍'} {h.query}
                        </a>
                        {isAdmin && <button onClick={() => deleteHistory(i)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <hr style={{ border: 0, borderTop: '1px dashed #ddd', margin: 0 }} />

              {/* 몽나 메모장 */}
              <div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#5d4037' }}>📝 몽나 메모장</h2>
                {isAdmin && (
                  <div style={{ marginBottom: '12px' }}>
                    <textarea 
                      value={memoInputText} 
                      onChange={(e) => setMemoInputText(e.target.value)} 
                      placeholder="아이디어나 메모를 적어보세요!" 
                      style={{ width: '100%', height: '90px', padding: '12px', border: '1px solid #ddd', borderRadius: '12px', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
                    />
                    <button onClick={saveMemo} style={{ marginTop: '8px', width: '100%', padding: '10px', background: '#C1ACD7', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>메모 저장하기</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                  {memoList.map((m, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', position: 'relative', fontSize: '13px' }}>
                      {isAdmin && <button onClick={() => deleteMemo(i)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>}
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{m.date}</div>
                      <div style={{ color: '#333', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsAddModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '480px', maxWidth: '90vw', padding: '35px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#8b5cf6', marginBottom: '20px' }}>📅 {isEditMode ? '일정 수정' : '일정 등록'} ({selectedDateKey})</h2>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>일정 제목</label>
              <input type="text" value={inputTitle} onChange={e => setInputTitle(e.target.value)} placeholder="예: 휴뱅 (본가), LCK 결승전" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontWeight: 'bold' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>방송 시간</label>
              <input type="text" value={inputTime} onChange={e => setInputTime(e.target.value)} placeholder="예: 오후 8:00" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontWeight: 'bold' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>방송 분류</label>
              <select value={inputType} onChange={e => setInputType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontWeight: 'bold' }}>
                <option value="방송">방송</option>
                <option value="합방">합방</option>
                <option value="휴방">휴방</option>
                <option value="겜방">겜방</option>
                <option value="LCK">LCK</option>
                <option value="같이보기">같이보기</option>
              </select>
            </div>

            {inputType === '합방' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>참여자 닉네임 (쉼표로 구분)</label>
                <input type="text" value={inputMembers} onChange={e => setInputMembers(e.target.value)} placeholder="예: 다룽, 츄르, 카푸" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', fontWeight: 'bold' }} />
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>상세 내용</label>
              <textarea value={inputContent} onChange={e => setInputContent(e.target.value)} placeholder="내용 입력" style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', resize: 'none' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>VOD 링크</label>
              <input type="text" value={inputVod} onChange={e => setInputVod(e.target.value)} placeholder="VOD 주소 입력" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>

            <button onClick={saveSchedule} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
              {isEditMode ? '일정 수정 완료' : '일정 등록하기'}
            </button>
          </div>
        </div>
      )}

      {/* 💡 일정 상세 보기 모달 (스크린샷과 똑같은 중앙 아바타 & 방송국 링크 카드 배치) */}
      {viewModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setViewModalItem(null)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '450px', maxWidth: '90vw', padding: '40px', position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewModalItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' }}>✕</button>
            
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#222', margin: 0 }}>{viewModalItem.sch.title}</h2>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {viewModalItem.sch.time && viewModalItem.sch.time !== '시간 미정' && (
                <span style={{ background: '#fbc531', color: 'white', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>{viewModalItem.sch.time}</span>
              )}
              <span style={{ background: viewModalItem.sch.backgroundColor || '#8b5cf6', color: 'white', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>{viewModalItem.sch.type}</span>
            </div>

            {/* 💡 합방 참여자 중앙 아바타 & 숲 방송국 링크 연동 (스크린샷 디자인 반영) */}
            {viewModalItem.sch.type === '합방' && viewModalItem.sch.members && viewModalItem.sch.members.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', width: '100%', margin: '10px 0' }}>
                {viewModalItem.sch.members.map((memberName: string, mIdx: number) => {
                  const name = memberName.trim();
                  // 매핑된 ID가 있으면 사용, 없으면 닉네임 사용
                  const stationId = streamerStationMap[name] || name;
                  const stationUrl = `https://www.sooplive.com/station/${stationId}`;
                  // SOOP 공식 프로필 이미지 URL 포맷 적용
                  const profileImg = `https://profile.img.sooplive.co.kr/LOGO/${stationId.charAt(0)}/${stationId}/${stationId}.jpg`;

                  return (
                    <a 
                      key={mIdx} 
                      href={stationUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      title={`${name} 숲 방송국 방문하기`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img 
                        src={profileImg} 
                        alt={name} 
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #8b5cf6', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', background: '#eee' }}
                        onError={(e: any) => {
                          // 프로필 이미지가 없을 경우 첫 글자 이니셜 아바타로 대체
                          e.target.src = `https://via.placeholder.com/64/8b5cf6/ffffff?text=${encodeURIComponent(name.charAt(0))}`;
                        }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{name}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* 상세 내용 */}
            {viewModalItem.sch.content && (
              <div style={{ width: '100%' }}>
                {viewModalItem.sch.content.startsWith('[GAME_LINK]') ? (
                  (() => {
                    const parts = viewModalItem.sch.content.replace('[GAME_LINK]', '').split('|');
                    return (
                      <a href={parts[1] || '#'} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '12px 20px', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', color: '#333', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #eee' }}>
                        🎮 {parts[0]}
                      </a>
                    );
                  })()
                ) : (
                  <div style={{ fontSize: '15px', color: '#555', background: '#f9f9f9', padding: '15px', borderRadius: '12px', whiteSpace: 'pre-wrap', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
                    {viewModalItem.sch.content}
                  </div>
                )}
              </div>
            )}

            {/* VOD 시청 버튼 */}
            {viewModalItem.sch.vodLink && (
              <a href={viewModalItem.sch.vodLink.startsWith('http') ? viewModalItem.sch.vodLink : `https://${viewModalItem.sch.vodLink}`} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', textAlign: 'center', backgroundColor: '#ff4757', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', textDecoration: 'none', boxSizing: 'border-box' }}>
                📺 다시보기 시청
              </a>
            )}

            {/* 관리자 전용 수정/삭제 버튼 */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '5px' }}>
                <button onClick={() => openEditModal(viewModalItem.sch, viewModalItem.dateKey)} style={{ flex: 1, background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>수정하기</button>
                <button onClick={() => deleteSchedule(viewModalItem.dateKey, viewModalItem.sch.id)} style={{ flex: 1, background: 'none', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>삭제하기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 톱니바퀴: 카테고리 색상 설정 모달 */}
      {isColorModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsColorModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '480px', padding: '35px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsColorModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#8b5cf6', marginBottom: '20px' }}>🎨 카테고리 색상 설정</h2>

            {Object.keys(categoryColors).map((catKey) => (
              <div key={catKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{catKey} 색상</span>
                <input 
                  type="color" 
                  value={(categoryColors as any)[catKey]} 
                  onChange={(e) => setCategoryColors({ ...categoryColors, [catKey]: e.target.value })} 
                  style={{ width: '60px', height: '35px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}
                />
              </div>
            ))}

            <button onClick={saveCategoryColors} style={{ marginTop: '20px', background: '#8b5cf6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>색상 저장 적용하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
