// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

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

// 💡 카테고리별 색상을 지정해주는 함수
const getCategoryColor = (type: string) => {
  switch (type) {
    case '합방': return '#4dabf7';
    case '휴방': return '#9ca3af';
    case '겜방': return '#f59e0b';
    case 'LCK': return '#8b5cf6';
    case '같이보기': return '#20c997';
    default: return '#ff9eb5'; // 방송
  }
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [schedules, setSchedules] = useState<any>({});
  const [memoList, setMemoList] = useState<any[]>([]);
  const [memoInput, setMemoInput] = useState('');
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [gameInput, setGameInput] = useState('');

  // 관리자 인증 모달
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 색상 설정 모달
  const [isColorSettingsModalOpen, setIsColorSettingsModalOpen] = useState(false);
  const [categoryColors, setCategoryColors] = useState({
    "합방": "#4dabf7", "방송": "#ff9eb5", "휴방": "#9ca3af", "겜방": "#f59e0b", "LCK": "#8b5cf6", "같이보기": "#20c997"
  });

  // 일정 추가/수정 모달 관련
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetId, setEditTargetId] = useState<any>(null);

  const [schTitle, setSchTitle] = useState('');
  const [schTime, setSchTime] = useState('시간 미정');
  const [schType, setSchType] = useState('방송');
  const [schContent, setSchContent] = useState('');
  const [schVod, setSchVod] = useState('');
  
  // 숲(SOOP) BJ 검색 관련 상태
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [autoCompleteList, setAutoCompleteList] = useState<any[]>([]);
  const searchTimerRef = useRef<any>(null);

  const [viewSch, setViewSch] = useState<any>(null);

  const scheduleRef = doc(db, 'mongna_calendar_data', 'schedule_data');
  const sidebarRef = doc(db, 'mongna_calendar_data', 'sidebar_state');

  useEffect(() => {
    if (localStorage.getItem('mongna_calendar_admin') === 'true') {
      setIsAdmin(true);
    }

    const unsubSch = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists()) {
        setSchedules(docSnap.data().data || {});
      }
    });

    const unsubSide = onSnapshot(sidebarRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMemoList(data.memoList || []);
        setSearchHistory(data.searchHistory || []);
      }
    });

    return () => {
      unsubSch();
      unsubSide();
    };
  }, []);

  const handleAdminClick = () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        localStorage.removeItem('mongna_calendar_admin');
      }
    } else {
      setPasswordInput('');
      setIsPasswordModalOpen(true);
    }
  };

  const verifyPassword = () => {
    if (passwordInput === "mongna1234") {
      setIsAdmin(true);
      localStorage.setItem('mongna_calendar_admin', 'true');
      setIsPasswordModalOpen(false);
      alert("관리자 인증 성공!");
    } else {
      alert("비밀번호가 틀렸습니다.");
      setPasswordInput('');
    }
  };

  const handleGameSearch = async (engine: string) => {
    if (!isAdmin) return alert("관리자만 검색할 수 있습니다.");
    if (!gameInput.trim()) return alert("게임 이름을 입력해주세요!");

    const query = gameInput.trim();
    const link = engine === 'steam' 
      ? `https://store.steampowered.com/search/?term=${encodeURIComponent(query)}` 
      : `https://www.google.com/search?q=${encodeURIComponent(query + ' 게임')}`;

    window.open(link, '_blank');

    const newHistory = [{ query, engine, link }, ...searchHistory.filter(h => h.query !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    await setDoc(sidebarRef, { searchHistory: newHistory, memoList }, { merge: true });
    setGameInput('');
  };

  const deleteHistory = async (idx: number) => {
    if (!isAdmin) return;
    const newHistory = searchHistory.filter((_, i) => i !== idx);
    setSearchHistory(newHistory);
    await setDoc(sidebarRef, { searchHistory: newHistory, memoList }, { merge: true });
  };

  const handleDragStart = (e: any, item: any) => {
    if (!isAdmin) return;
    e.dataTransfer.setData("gameName", item.query);
    e.dataTransfer.setData("gameLink", item.link);
  };

  const handleDrop = async (e: any, dateKey: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    const gameName = e.dataTransfer.getData("gameName");
    const gameLink = e.dataTransfer.getData("gameLink");

    if (gameName) {
      const newSch = {
        id: Date.now(),
        title: gameName,
        time: '오후 8:00',
        type: '겜방',
        members: [],
        content: `[GAME_LINK]${gameName}|${gameLink}`,
        vodLink: ''
      };
      const updated = { ...schedules };
      if (!updated[dateKey]) updated[dateKey] = [];
      updated[dateKey].push(newSch);
      await setDoc(scheduleRef, { data: updated }, { merge: true });
    }
  };

  const handleMemberSearch = async (e: any) => {
    const query = e.target.value;
    setMemberSearch(query);

    if (query.trim().length < 1) {
      setAutoCompleteList([]);
      return;
    }

    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/soop?keyword=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data && data.RES) {
          setAutoCompleteList(data.RES);
        } else {
          setAutoCompleteList([]);
        }
      } catch (error) {
        console.error("검색 에러:", error);
        setAutoCompleteList([]);
      }
    }, 300);
  };

  const addMemberTag = (nick: string, id: string) => {
    const imgUrl = id ? `https://profile.img.afreecatv.com/LOGO/${id.substring(0, 2)}/${id}/${id}.jpg` : '';
    setCurrentMembers([...currentMembers, { name: nick, img: imgUrl, soopId: id }]);
    setMemberSearch('');
    setAutoCompleteList([]);
  };

  const removeMemberTag = (idx: number) => {
    setCurrentMembers(currentMembers.filter((_, i) => i !== idx));
  };

  const saveSchedule = async () => {
    if (!schTitle.trim()) return alert("제목을 입력해주세요!");

    const updated = { ...schedules };
    if (!updated[selectedDateKey]) updated[selectedDateKey] = [];

    if (isEditing) {
      updated[selectedDateKey] = updated[selectedDateKey].map((s: any) => {
        if (s.id === editTargetId) {
          return {
            ...s,
            title: schTitle,
            time: schTime,
            type: schType,
            members: schType === '합방' ? currentMembers : [],
            content: schContent,
            vodLink: schVod
          };
        }
        return s;
      });
    } else {
      const newSch = {
        id: Date.now(),
        title: schTitle,
        time: schTime,
        type: schType,
        members: schType === '합방' ? currentMembers : [],
        content: schContent,
        vodLink: schVod
      };
      updated[selectedDateKey].push(newSch);
    }

    await setDoc(scheduleRef, { data: updated }, { merge: true });
    setIsAddModalOpen(false);
  };

  const openEditModal = () => {
    setIsViewModalOpen(false);
    setIsEditing(true);
    setEditTargetId(viewSch.id);
    setSelectedDateKey(selectedDateKey);

    setSchTitle(viewSch.title);
    setSchTime(viewSch.time || '시간 미정');
    setSchType(viewSch.type || '방송');
    setSchContent(viewSch.content || '');
    setSchVod(viewSch.vodLink || '');
    setCurrentMembers(viewSch.members ? viewSch.members.map((m: any) => typeof m === 'string' ? { name: m, img: '', soopId: '' } : m) : []);
    
    setIsAddModalOpen(true);
  };

  const deleteSchedule = async () => {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    const updated = { ...schedules };
    updated[selectedDateKey] = updated[selectedDateKey].filter((s: any) => s.id !== viewSch.id);
    await setDoc(scheduleRef, { data: updated }, { merge: true });
    setIsViewModalOpen(false);
  };

  const saveMemo = async () => {
    if (!memoInput.trim()) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newMemoList = [{ date: dateStr, text: memoInput }, ...memoList];
    setMemoList(newMemoList);
    await setDoc(sidebarRef, { memoList: newMemoList, searchHistory }, { merge: true });
    setMemoInput('');
  };

  const deleteMemo = async (idx: number) => {
    const newMemoList = memoList.filter((_, i) => i !== idx);
    setMemoList(newMemoList);
    await setDoc(sidebarRef, { memoList: newMemoList, searchHistory }, { merge: true });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  return (
    <div style={{ minHeight: '100vh', background: 'repeating-linear-gradient(-45deg, #fefaff, #fefaff 20px, #f4effa 20px, #f4effa 40px)', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 상단 네비게이션 바 */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '2px dashed #C1ACD7', marginBottom: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="몽나 로고" style={{ height: '40px', objectFit: 'contain' }} />
          </a>
          <div style={{ display: 'flex', gap: '30px', fontWeight: '800', fontSize: '15px' }}>
            <a href="/" style={{ textDecoration: 'none', color: '#333' }}>홈</a>
            <a href="/" style={{ textDecoration: 'none', color: '#8b5cf6', position: 'relative' }}>캘린더<span style={{ position: 'absolute', bottom: '-5px', left: 0, width: '100%', height: '3px', background: '#8b5cf6', borderRadius: '2px' }}></span></a>
            <a href="/song" style={{ textDecoration: 'none', color: '#333' }}>노래책</a>
            <a href="/reward" style={{ textDecoration: 'none', color: '#333' }}>업보(보상)</a>
            <a href="/vod" style={{ textDecoration: 'none', color: '#333' }}>VOD</a>
          </div>
          <button onClick={handleAdminClick} style={{ padding: '8px 18px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', border: '2px solid #C1ACD7', background: isAdmin ? '#ffd700' : 'white', color: isAdmin ? '#333' : '#8b5cf6' }}>
            {isAdmin ? '👑 관리자 모드' : '🔒 관리자 로그인'}
          </button>
        </div>
      </nav>

      {/* 메인 컨테이너 */}
      <div style={{ maxWidth: '1500px', margin: '0 auto', background: 'rgba(255,255,255,0.9)', borderRadius: '40px', padding: '40px', border: '4px solid white', outline: '2px dashed #C1ACD7', outlineOffset: '-12px', display: 'flex', gap: '40px', boxSizing: 'border-box' }}>
        
        {/* 달력 영역 */}
        <div style={{ flex: 3.5, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} style={{ background: 'white', border: '2px dashed #C1ACD7', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontWeight: '900', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
            <div style={{ background: '#f4effa', padding: '10px 20px', borderRadius: '30px', border: '2px solid #C1ACD7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#8b5cf6' }}>{year}</span><span style={{ fontWeight: '900', color: '#64748b' }}>년</span>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#8b5cf6' }}>{String(month).padStart(2, '0')}</span><span style={{ fontWeight: '900', color: '#64748b' }}>월</span>
            </div>
            <button onClick={() => setCurrentDate(new Date(year, month, 1))} style={{ background: 'white', border: '2px dashed #C1ACD7', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontWeight: '900', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px' }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} style={{ padding: '12px 0', background: '#f4effa', border: '2px dashed #C1ACD7', borderRadius: '16px', textAlign: 'center', fontWeight: '900', color: i === 0 ? '#ff6b6b' : i === 6 ? '#4dabf7' : '#8b5cf6' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${month}-${day}`;
              const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;
              const daySchedules = schedules[dateKey] || [];

              return (
                <div key={dateKey} 
                  onDoubleClick={() => { 
                    if(isAdmin) { 
                      setSelectedDateKey(dateKey); 
                      setIsEditing(false);
                      setSchTitle('');
                      setSchTime('시간 미정');
                      setSchType('방송');
                      setSchContent('');
                      setSchVod('');
                      setCurrentMembers([]);
                      setIsAddModalOpen(true); 
                    } 
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, dateKey)}
                  style={{ minHeight: '130px', padding: '10px', border: '2px solid #f1f5f9', borderRadius: '20px', backgroundColor: isToday ? 'rgba(193, 172, 215, 0.2)' : 'white', boxShadow: isToday ? 'inset 0 0 0 2px #C1ACD7' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: '900', fontSize: '16px', color: '#64748b' }}>{day}</span>
                  {daySchedules.map((sch: any) => (
                    <div key={sch.id} onClick={(e) => { e.stopPropagation(); setViewSch(sch); setSelectedDateKey(dateKey); setIsViewModalOpen(true); }}
                      style={{ fontSize: '12px', padding: '8px', borderRadius: '10px', fontWeight: '800', background: getCategoryColor(sch.type), color: 'white', cursor: 'pointer' }}>
                      {sch.time && sch.time !== '시간 미정' && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '2px 4px', borderRadius: '4px', marginRight: '4px' }}>{sch.time}</span>}
                      {sch.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 사이드바 */}
        <div style={{ flex: 1, background: 'white', borderRadius: '30px', padding: '30px', border: '3px dashed #C1ACD7', display: 'flex', flexDirection: 'column', gap: '30px', height: 'fit-content' }}>
          
          <div>
            <h2 style={{ color: '#8b5cf6', fontSize: '20px', fontWeight: '900', textAlign: 'center', marginBottom: '15px' }}>🎮 종겜 링크 찾기</h2>
            {isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <input type="text" value={gameInput} onChange={(e) => setGameInput(e.target.value)} placeholder="게임 이름 입력 (예: 팰월드)" style={{ padding: '12px', borderRadius: '15px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleGameSearch('steam')} style={{ flex: 1, padding: '10px', background: '#1b2838', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Steam 검색</button>
                  <button onClick={() => handleGameSearch('google')} style={{ flex: 1, padding: '10px', background: 'white', color: '#8b5cf6', border: '2px solid #C1ACD7', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Google 검색</button>
                </div>
                <p style={{ fontSize: '11px', color: '#8b5cf6', textAlign: 'center', margin: 0, fontWeight: 'bold' }}>* 검색 기록을 드래그해서 날짜에 놓아보세요!</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchHistory.map((h, idx) => (
                <div key={idx} draggable={isAdmin} onDragStart={(e) => handleDragStart(e, h)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '13px', cursor: isAdmin ? 'grab' : 'default' }}>
                  <a href={h.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.engine === 'steam' ? '💨' : '🔍'} {h.query}
                  </a>
                  {isAdmin && <button onClick={() => deleteHistory(idx)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>}
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '2px dashed #C1ACD7', margin: 0 }} />

          <div>
            <h2 style={{ color: '#8b5cf6', fontSize: '20px', fontWeight: '900', textAlign: 'center', marginBottom: '15px' }}>📝 몽나 메모장</h2>
            {isAdmin && (
              <div>
                <textarea value={memoInput} onChange={(e) => setMemoInput(e.target.value)} placeholder="메모를 적어보세요!" style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '15px', border: '2px solid #e2e8f0', resize: 'none', fontWeight: 'bold', boxSizing: 'border-box', outline: 'none' }} />
                <button onClick={saveMemo} style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#C1ACD7', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>메모 저장하기</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', marginTop: '15px' }}>
              {memoList.map((m, idx) => (
                <div key={idx} style={{ background: 'white', border: '2px solid #f4effa', borderRadius: '16px', padding: '15px', position: 'relative', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                  {isAdmin && <button onClick={() => deleteMemo(idx)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#cbd5e1', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>}
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>{m.date}</div>
                  <div style={{ whiteSpace: 'pre-wrap', fontWeight: '500' }}>{m.text}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 관리자 로그인 비밀번호 모달 */}
      {isPasswordModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '32px', padding: '40px', width: '380px', border: '4px dashed #C1ACD7', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'center' }}>
            <h3 style={{ color: '#8b5cf6', margin: 0, fontWeight: '900' }}>관리자 인증</h3>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', margin: 0 }}>비밀번호를 입력해주세요.</p>
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyPassword()} placeholder="비밀번호 입력" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none', textAlign: 'center' }} autoFocus />
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button onClick={verifyPassword} style={{ flex: 1, padding: '14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>확인</button>
              <button onClick={() => setIsPasswordModalOpen(false)} style={{ flex: 1, padding: '14px', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 등록 / 수정 모달 */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '32px', padding: '40px', width: '500px', border: '4px dashed #C1ACD7', display: 'flex', flexDirection: 'column', gap: '15px', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#8b5cf6', margin: 0 }}>{isEditing ? '일정 수정' : '일정 등록'}</h2>
            <input type="text" value={schTitle} onChange={(e) => setSchTitle(e.target.value)} placeholder="일정 제목" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }} />
            <select value={schTime} onChange={(e) => setSchTime(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }}>
              <option value="시간 미정">시간 미정</option>
              <option value="오후 8:00">오후 8:00</option>
              <option value="오후 9:00">오후 9:00</option>
            </select>
            
            {/* 💡 [수정 완료] 버튼 6개를 3칸씩 2줄(Grid)로 똑같은 크기로 정렬! */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {['방송', '합방', '휴방', '겜방', 'LCK', '같이보기'].map(t => (
                <button key={t} type="button" onClick={() => setSchType(t)} style={{ padding: '12px 0', borderRadius: '15px', border: 'none', fontWeight: '900', background: schType === t ? getCategoryColor(t) : '#f1f5f9', color: schType === t ? 'white' : '#64748b', cursor: 'pointer', transition: '0.2s' }}>{t}</button>
              ))}
            </div>

            {schType === '합방' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <label style={{ fontSize: '14px', fontWeight: '900' }}>참여자 숲(SOOP) 검색</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {currentMembers.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '2px solid #C1ACD7', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6' }}>
                      {m.img && <img src={m.img} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />}
                      {m.name}
                      <span onClick={() => removeMemberTag(idx)} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: '900' }}>✕</span>
                    </div>
                  ))}
                </div>
                <input type="text" value={memberSearch} onChange={handleMemberSearch} onKeyDown={(e) => e.key === 'Enter' && addMemberTag(memberSearch, '')} placeholder="닉네임 검색 (입력 후 잠시 대기해주세요)" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }} />
                
                {autoCompleteList.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e1e1e', borderRadius: '12px', maxHeight: '250px', overflowY: 'auto', zIndex: 10, boxShadow: '0 15px 35px rgba(0,0,0,0.4)', border: '1px solid #333' }}>
                    {autoCompleteList.map(bj => (
                      <div key={bj.user_id} onClick={() => addMemberTag(bj.user_nick, bj.user_id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #2d2d2d' }}>
                        <img src={`https://profile.img.afreecatv.com/LOGO/${bj.user_id.substring(0,2)}/${bj.user_id}/${bj.user_id}.jpg`} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} onError={(e:any)=>{e.target.src='https://via.placeholder.com/40'}} />
                        <div>
                          <div style={{ color: 'white', fontWeight: '900', fontSize: '15px' }}>{bj.user_nick}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px' }}>@{bj.user_id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea value={schContent} onChange={(e) => setSchContent(e.target.value)} placeholder="상세 내용" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', resize: 'none', height: '80px', fontWeight: '500', outline: 'none' }} />
            <input type="text" value={schVod} onChange={(e) => setSchVod(e.target.value)} placeholder="VOD 링크" style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }} />
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button onClick={saveSchedule} style={{ flex: 1, padding: '16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer' }}>{isEditing ? '수정 완료' : '등록하기'}</button>
              <button onClick={() => setIsAddModalOpen(false)} style={{ flex: 1, padding: '16px', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 상세 보기 모달 */}
      {isViewModalOpen && viewSch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '32px', padding: '40px', width: '450px', border: '4px dashed #C1ACD7', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button onClick={() => setIsViewModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>✕</button>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900' }}>{viewSch.title}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {viewSch.time && <span style={{ border: '2px solid #C1ACD7', padding: '8px 20px', borderRadius: '25px', fontWeight: '900', color: '#8b5cf6', fontSize: '15px' }}>{viewSch.time}</span>}
              <span style={{ background: getCategoryColor(viewSch.type), color: 'white', padding: '8px 25px', borderRadius: '25px', fontWeight: '900', fontSize: '15px' }}>{viewSch.type}</span>
            </div>
            
            {viewSch.members && viewSch.members.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {viewSch.members.map((m: any, idx: number) => (
                  <a key={idx} href={m.soopId ? `https://ch.sooplive.co.kr/${m.soopId}` : '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '2px solid #C1ACD7', padding: '6px 16px', borderRadius: '25px', textDecoration: 'none', color: '#8b5cf6', fontWeight: '900', fontSize: '14px', boxShadow: '0 4px 10px rgba(193, 172, 215, 0.2)' }}>
                    {m.img && <img src={m.img} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                    {m.name}
                  </a>
                ))}
              </div>
            )}

            {viewSch.content && (
              <div style={{ background: '#f4effa', padding: '25px', borderRadius: '20px', textAlign: 'left', whiteSpace: 'pre-wrap', fontWeight: '500', fontSize: '15px', lineHeight: '1.6' }}>
                {viewSch.content.startsWith('[GAME_LINK]') ? (
                  <a href={viewSch.content.split('|')[1]} target="_blank" rel="noreferrer" style={{ background: '#8b5cf6', color: 'white', padding: '15px 30px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '900', textDecoration: 'none' }}>
                    🎮 {viewSch.content.replace('[GAME_LINK]', '').split('|')[0]}
                  </a>
                ) : viewSch.content}
              </div>
            )}

            {viewSch.vodLink && <a href={viewSch.vodLink} target="_blank" rel="noreferrer" style={{ background: '#ff4757', color: 'white', padding: '16px', borderRadius: '16px', fontWeight: '900', textDecoration: 'none', fontSize: '16px', boxShadow: '0 10px 20px rgba(255,71,87,0.3)' }}>📺 다시보기 시청</a>}
            
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button onClick={openEditModal} style={{ flex: 1, background: 'white', border: '2px solid #8b5cf6', color: '#8b5cf6', padding: '14px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '15px' }}>이 일정 수정하기</button>
                <button onClick={deleteSchedule} style={{ flex: 1, background: 'white', border: '2px solid #fca5a5', color: '#ef4444', padding: '14px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '15px' }}>이 일정 삭제</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
