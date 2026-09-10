'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [schedules, setSchedules] = useState<any>({});
  
  // 캘린더와 완벽하게 동일한 기본 파스텔 색상 세팅
  const [categoryColors, setCategoryColors] = useState({
    합방: "#4dabf7",
    방송: "#ff9eb5",
    휴방: "#9ca3af",
    겜방: "#f59e0b",
    LCK: "#8b5cf6",
    같이보기: "#20c997"
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('mongna_home_admin') === 'true' || localStorage.getItem('mongna_calendar_admin') === 'true');
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
    const colorsRef = doc(db, 'mongna_calendar_data', 'category_colors');

    // 1. 캘린더와 똑같이 관리자가 변경한 색상 실시간 연동
    const unsubColors = onSnapshot(colorsRef, (docSnap) => {
      if (docSnap.exists()) {
        setCategoryColors(prev => ({ ...prev, ...(docSnap.data() as any) }));
      }
    });

    // 2. 캘린더의 일정 데이터를 실시간으로 홈 화면으로 끌어오기
    const unsubSchedule = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists() && Object.keys(docSnap.data().data || {}).length > 0) {
        setSchedules(docSnap.data().data);
      }
      setIsLoading(false);
    });

    return () => {
      unsubColors();
      unsubSchedule();
    };
  }, []);

  // 오늘 날짜를 기준으로 앞으로 7일간의 날짜 배열 생성
  const today = new Date();
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#1e293b', minHeight: '100vh', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {isLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>홈 화면을 불러오는 중입니다... 💜</div>
        </div>
      )}

      {/* 상단 네비게이션바 (공통) */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', marginBottom: '30px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="몽나 로고" style={{ height: '40px', objectFit: 'contain' }} />
          </a>

          <div style={{ display: 'flex', gap: '30px', fontWeight: 800, color: '#333', fontSize: '15px' }}>
            <a href="/" style={{ textDecoration: 'none', color: '#8b5cf6', position: 'relative' }}>홈</a>
            <a href="/calendar" style={{ textDecoration: 'none', color: 'inherit' }}>캘린더</a>
            <a href="/song.html" style={{ textDecoration: 'none', color: 'inherit' }}>노래책</a>
            <a href="/reward.html" style={{ textDecoration: 'none', color: 'inherit' }}>업보(보상)</a>
            <a href="/vod.html" style={{ textDecoration: 'none', color: 'inherit' }}>VOD</a>
            <a href="/wiki" style={{ textDecoration: 'none', color: 'inherit' }}>몽무위키</a>
          </div>

          <div style={{ width: '80px' }}></div> {/* 레이아웃 밸런스용 빈 공간 */}
        </div>
      </nav>

      {/* 홈 화면 메인 레이아웃 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 50px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* 좌측 몽나 프로필 이미지 영역 */}
        <div style={{ flex: 1, minWidth: '350px', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          {/* 실제 쓰시던 몽나 프로필 사진 주소로 교체해주세요 */}
          <img 
            src="https://stimg.afreecatv.com/LOGO/pi/pinktape8/pinktape8.jpg" 
            alt="몽나 메인 사진" 
            style={{ width: '100%', height: '100%', minHeight: '600px', objectFit: 'cover' }} 
            onError={(e: any) => e.target.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
          />
        </div>

        {/* 우측 콘텐츠 영역 */}
        <div style={{ flex: 2, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* 1. 이번 주 일정 (자동 7일 연동) */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 이번 주 일정
              </h2>
              <a href="/calendar" style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', textDecoration: 'none', background: '#f1f5f9', padding: '6px 14px', borderRadius: '12px' }}>전체보기</a>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {upcomingDays.map((dateObj, idx) => {
                const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
                const daySchedules = schedules[dateKey] || [];
                const dayOfWeek = dateObj.getDay();
                
                let numColor = '#333';
                if (dayOfWeek === 0) numColor = '#ff6b6b';
                if (dayOfWeek === 6) numColor = '#4dabf7';
                const isToday = idx === 0;

                return (
                  <div key={idx} style={{ 
                    flex: '1 0 100px', minHeight: '120px', padding: '15px 10px', 
                    border: isToday ? '2px solid #a855f7' : '1px solid #f1f3f5', 
                    borderRadius: '16px', backgroundColor: isToday ? '#f3e8ff' : '#ffffff', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: numColor, marginBottom: '10px' }}>{dateObj.getDate()}</span>
                    
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {daySchedules.length > 0 ? daySchedules.map((sch: any) => {
                        // 캘린더와 동일한 색상 매핑 로직 적용!
                        const bg = sch.backgroundColor || (categoryColors as any)[sch.type] || '#fb819e';
                        return (
                          <div key={sch.id} style={{ 
                            fontSize: '11px', padding: '6px', borderRadius: '8px', fontWeight: 700, 
                            backgroundColor: bg, color: '#fff', textAlign: 'center', lineHeight: '1.3',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
                          }}>
                            {sch.time && sch.time !== '시간 미정' && (
                              <div style={{ opacity: 0.9, fontSize: '10px', marginBottom: '2px' }}>[{sch.time}]</div>
                            )}
                            <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sch.title}</div>
                          </div>
                        );
                      }) : (
                        <div style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>일정 없음</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. 몽튜브 최신 영상 (예시용 카드) */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ▶️ 몽튜브 최신 영상
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              
              {/* 영상 카드 1 */}
              <a href="#" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                   {/* 유튜브 썸네일 이미지 주소를 넣으세요 */}
                   <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>썸네일</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1.4 }}>버튜버는 어떤 운동을 할까? 90일의 기록 #3</div>
              </a>

              {/* 영상 카드 2 */}
              <a href="#" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                   <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>썸네일</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1.4 }}>T1은 24, 25년 롤드컵 우승이다. #shorts</div>
              </a>

            </div>
          </section>

          {/* 3. 몽나링크 */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔗 몽나링크
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              
              <a href="https://www.sooplive.com/pinktape8" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1e293b', transition: '0.2s' }}>
                <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📺</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '15px' }}>숲 방송국</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>생방송 보러가기</div>
                </div>
              </a>

              <a href="#" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1e293b', transition: '0.2s' }}>
                <div style={{ width: '40px', height: '40px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>▶️</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '15px' }}>유튜브</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>다시보기 & 하이라이트</div>
                </div>
              </a>

              <a href="#" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1e293b', transition: '0.2s' }}>
                <div style={{ width: '40px', height: '40px', background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>☕</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '15px' }}>팬카페</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>소통과 정보 나눔</div>
                </div>
              </a>

              <a href="#" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1e293b', transition: '0.2s' }}>
                <div style={{ width: '40px', height: '40px', background: '#ffedd5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📸</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '15px' }}>인스타그램</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>일상 공유</div>
                </div>
              </a>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
