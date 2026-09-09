'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

export default function CalendarPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // 일정 추가 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputTime, setInputTime] = useState('');
  const [inputColor, setInputColor] = useState('#fb819e'); // 기본 핑크

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

    const unsubscribe = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists()) {
        setScheduleData(docSnap.data().data || {});
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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

  // 달력 날짜 계산
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

  // 날짜 클릭 시 일정 추가 모달 오픈 (관리자만)
  const handleDateClick = (dateObj: Date) => {
    if (!isAdmin) {
      alert("관리자 로그인 후 일정을 추가할 수 있습니다.");
      return;
    }
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
    setSelectedDateKey(key);
    setInputTitle('');
    setInputTime('');
    setInputColor('#fb819e');
    setIsModalOpen(true);
  };

  // 일정 저장하기
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

    updatedData[selectedDateKey].push({
      title: inputTitle.trim(),
      time: inputTime.trim() || '미정',
      backgroundColor: inputColor,
      color: inputColor
    });

    try {
      await setDoc(scheduleRef, { data: updatedData }, { merge: true });
      setIsModalOpen(false);
      alert("일정이 저장되었습니다!");
    } catch (e) {
      alert("저장 실패!");
    }
  };

  // 일정 삭제하기 (관리자)
  const deleteSchedule = async (dateKey: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

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
      updatedData[dateKey].splice(index, 1);
      if (updatedData[dateKey].length === 0) {
        delete updatedData[dateKey];
      }
    }

    try {
      await setDoc(scheduleRef, { data: updatedData }, { merge: true });
    } catch (e) {
      alert("삭제 실패!");
    }
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)', color: '#1e293b', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      {/* 로딩 */}
      {isLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#a855f7', fontWeight: 800, fontSize: '15px' }}>캘린더를 불러오는 중입니다... 🌙</div>
        </div>
      )}

      {/* 상단바 */}
      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(168, 85, 247, 0.1)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="로고" style={{ height: '40px', objectFit: 'contain' }} />
        </a>

        <div style={{ display: 'flex', gap: '30px', fontWeight: 800, fontSize: '15px' }}>
          <a href="/" style={{ textDecoration: 'none', color: '#1e293b' }}>홈</a>
          <a href="/calender" style={{ textDecoration: 'none', color: '#a855f7' }}>캘린더</a>
          <a href="/song.html" style={{ textDecoration: 'none', color: '#1e293b' }}>노래책</a>
          <a href="/reward.html" style={{ textDecoration: 'none', color: '#1e293b' }}>업보(보상)</a>
          <a href="/vod.html" style={{ textDecoration: 'none', color: '#1e293b' }}>VOD</a>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={toggleAdmin} style={{ background: isAdmin ? '#ffd700' : 'white', border: '1px solid #ddd', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isAdmin ? '👑 관리자' : '🔒 로그인'}
          </button>
        </div>
      </div>

      {/* 캘린더 본문 */}
      <div style={{ maxWidth: '1300px', margin: '40px auto', padding: '0 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900 }}>📅 몽나 방송 캘린더</h1>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={prevMonth} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>◀ 이전 달</button>
            <span style={{ fontSize: '20px', fontWeight: 900 }}>{year}년 {month + 1}월</span>
            <button onClick={nextMonth} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>다음 달 ▶</button>
          </div>
        </div>

        {isAdmin && (
          <div style={{ background: '#f3e8ff', padding: '15px 20px', borderRadius: '16px', marginBottom: '20px', color: '#7e22ce', fontWeight: 'bold' }}>
            👑 관리자 모드 활성화됨: 캘린더의 원하는 날짜를 클릭하여 새로운 일정을 추가하고 색상을 지정할 수 있습니다!
          </div>
        )}

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px', textAlign: 'center', fontWeight: 900, fontSize: '16px' }}>
          <div style={{ color: '#ef4444' }}>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div style={{ color: '#3b82f6' }}>토</div>
        </div>

        {/* 날짜 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {calendarDays.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={idx} style={{ background: 'transparent', minHeight: '130px' }}></div>;
            }

            const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
            const daySchedules = scheduleData[key] || [];
            const todayStr = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const isToday = (key === todayStr);
            const dayOfWeek = dateObj.getDay();

            let numColor = '#1e293b';
            if (dayOfWeek === 0) numColor = '#ef4444';
            else if (dayOfWeek === 6) numColor = '#3b82f6';

            return (
              <div 
                key={idx} 
                onClick={() => handleDateClick(dateObj)}
                style={{ 
                  background: isToday ? '#f3e8ff' : '#ffffff', 
                  border: isToday ? '2px solid #a855f7' : '1px solid #f1f5f9', 
                  borderRadius: '16px', 
                  padding: '12px', 
                  minHeight: '140px', 
                  cursor: isAdmin ? 'pointer' : 'default',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 900, color: numColor, marginBottom: '4px' }}>
                  {dateObj.getDate()}
                </div>
                {daySchedules.map((sch: any, sIdx: number) => {
                  const bgColor = sch.backgroundColor || sch.color || '#fb819e';
                  return (
                    <div 
                      key={sIdx} 
                      style={{ 
                        background: bgColor, 
                        color: 'white', 
                        padding: '6px 8px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        position: 'relative',
                        wordBreak: 'keep-all'
                      }}
                    >
                      <div style={{ background: 'rgba(0,0,0,0.15)', display: 'inline-block', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', marginBottom: '3px' }}>
                        [{sch.time || '미정'}]
                      </div>
                      <div>{sch.title}</div>
                      {isAdmin && (
                        <button 
                          onClick={(e) => deleteSchedule(key, sIdx, e)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '450px', padding: '35px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#a855f7', marginBottom: '20px' }}>📅 일정 추가 ({selectedDateKey})</h2>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📌 일정 내용 (제목)</label>
              <input type="text" value={inputTitle} onChange={e => setInputTitle(e.target.value)} placeholder="예: 휴뱅 (본가), LCK 결승전" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>⏰ 시간</label>
              <input type="text" value={inputTime} onChange={e => setInputTime(e.target.value)} placeholder="예: 오후 8:00 또는 미정" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>🎨 일정 색상 선택</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div onClick={() => setInputColor('#fb819e')} style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#fb819e', cursor: 'pointer', border: inputColor === '#fb819e' ? '3px solid #1e293b' : 'none' }} title="기본 핑크" />
                <div onClick={() => setInputColor('#6b7280')} style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#6b7280', cursor: 'pointer', border: inputColor === '#6b7280' ? '3px solid #1e293b' : 'none' }} title="회색 (휴뱅)" />
                <div onClick={() => setInputColor('#7c3aed')} style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#7c3aed', cursor: 'pointer', border: inputColor === '#7c3aed' ? '3px solid #1e293b' : 'none' }} title="보라색 (LCK)" />
                <div onClick={() => setInputColor('#d97706')} style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#d97706', cursor: 'pointer', border: inputColor === '#d97706' ? '3px solid #1e293b' : 'none' }} title="주황색 (게임/탐정)" />
                <input type="color" value={inputColor} onChange={e => setInputColor(e.target.value)} style={{ width: '35px', height: '35px', border: 'none', cursor: 'pointer', background: 'none' }} title="직접 색상 선택" />
              </div>
            </div>

            <button onClick={saveSchedule} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>일정 저장하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
