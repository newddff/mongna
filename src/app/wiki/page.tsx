'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

export default function WikiPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [wikiData, setWikiData] = useState<any>({
    profile: {
      name: '몽나_',
      image: 'https://stimg.afreecatv.com/LOGO/pi/pinktape8/pinktape8.jpg',
      sections: [
        { title: '📝 몽나 소개', content: '' },
        { title: '📜 방송 규칙', content: '' },
        { title: '🗣️ 유행어 & 밈', content: '' }
      ]
    },
    history: []
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // 현재 보고 있는 탭 (백과사전 or 역사)
  const [activeTab, setActiveTab] = useState('wiki'); 

  // 페이지 넘기기 상태 (백과사전 탭)
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const ITEMS_PER_PAGE = 3; // 한 페이지에 보여줄 질문/답변 개수

  // 모달 상태 관리
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [viewModalData, setViewModalData] = useState<any>(null);

  // 폼(Form) 입력 상태
  const [epName, setEpName] = useState('');
  const [epImg, setEpImg] = useState('');
  const [epSections, setEpSections] = useState<{title: string, content: string}[]>([]);

  const [ecId, setEcId] = useState<number | null>(null);
  const [ecTitle, setEcTitle] = useState('');
  const [ecDate, setEcDate] = useState('');
  const [ecThumb, setEcThumb] = useState('');
  const [ecDesc, setEcDesc] = useState('');
  const [ecVod, setEcVod] = useState('');

  // 🎵 책 넘기는 소리 재생 함수 (무음 구간 0.4초 자르고 즉시 재생)
  const playPageSound = () => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/page-flip.mp3');
      audio.currentTime = 0.4;
      audio.play().catch(e => console.log('소리 재생 무시됨:', e));
    }
  };

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
    const wikiRef = doc(db, 'mongna_calendar_data', 'wiki_data');

    const unsubWiki = onSnapshot(wikiRef, (docSnap) => {
      try {
        if (docSnap.exists() && docSnap.data().data) {
          setWikiData(docSnap.data().data);
        }
        setIsLoading(false);
      } catch (e) {
        console.error("위키 데이터 로드 오류:", e);
        setIsLoading(false);
      }
    });

    return () => unsubWiki();
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      if (confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mongna_home_admin');
          localStorage.removeItem('mongna_calendar_admin');
        }
      }
    } else {
      const password = prompt("관리자 비밀번호를 입력해주세요.");
      if (password === "mongna1234") {
        setIsAdmin(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mongna_home_admin', 'true');
          localStorage.setItem('mongna_calendar_admin', 'true');
        }
        alert("인증 성공! 연필 모양 버튼을 눌러 위키를 꾸며보세요.");
      } else if (password !== null) {
        alert("비밀번호가 틀렸습니다.");
      }
    }
  };

  const getFirebaseRef = () => {
    const firebaseConfig = { apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso", authDomain: "mongna-vod.firebaseapp.com", projectId: "mongna-vod", storageBucket: "mongna-vod.firebasestorage.app", messagingSenderId: "310663611402", appId: "1:310663611402:web:1d607304ce4d7331b5cbf3" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return doc(db, 'mongna_calendar_data', 'wiki_data');
  };

  // 프로필(동적 항목) 편집 열기
  const openProfileEdit = () => {
    const p = wikiData.profile;
    setEpName(p.name || '');
    setEpImg(p.image || '');
    
    const loadedSections = p.sections || [
      { title: '📝 몽나 소개', content: p.desc || '' },
      { title: '📜 방송 규칙', content: p.rules || '' },
      { title: '🗣️ 유행어 & 밈', content: p.meme || '' }
    ];
    setEpSections(loadedSections);
    setIsProfileModalOpen(true);
  };

  const saveProfile = async () => {
    const newProfile = {
      name: epName.trim() || '몽나_',
      image: epImg.trim(),
      sections: epSections
    };
    try {
      const updatedData = { ...wikiData, profile: newProfile };
      await setDoc(getFirebaseRef(), { data: updatedData }, { merge: true });
      setIsProfileModalOpen(false);
    } catch (e) { alert('저장 실패'); }
  };

  const openCardEdit = (cardId: number | null) => {
    if (cardId) {
      const card = wikiData.history.find((c: any) => c.id === cardId);
      if (card) {
        setEcId(card.id);
        setEcTitle(card.title || '');
        setEcDate(card.date || '');
        setEcThumb(card.thumb || '');
        setEcDesc(card.desc || '');
        setEcVod(card.vodLink || '');
      }
    } else {
      const now = new Date();
      setEcId(null);
      setEcTitle('');
      setEcDate(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`);
      setEcThumb('');
      setEcDesc('');
      setEcVod('');
    }
    setIsCardModalOpen(true);
  };

  const saveCard = async () => {
    const title = ecTitle.trim();
    const date = ecDate.trim();
    if (!title || !date) return alert("제목과 날짜는 필수입니다!");

    const newCard = {
      id: ecId || Date.now(),
      title,
      date,
      thumb: ecThumb.trim(),
      desc: ecDesc.trim(),
      vodLink: ecVod.trim()
    };

    let updatedHistory = [...(wikiData.history || [])];
    if (ecId) {
      const idx = updatedHistory.findIndex((c: any) => c.id === ecId);
      if (idx > -1) updatedHistory[idx] = newCard;
    } else {
      updatedHistory.push(newCard);
    }

    try {
      const updatedData = { ...wikiData, history: updatedHistory };
      await setDoc(getFirebaseRef(), { data: updatedData }, { merge: true });
      setIsCardModalOpen(false);
    } catch (e) { alert('저장 실패'); }
  };

  const deleteCard = async (cardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 기록을 정말 삭제하시겠습니까?")) return;
    const updatedHistory = wikiData.history.filter((c: any) => c.id !== cardId);
    try {
      const updatedData = { ...wikiData, history: updatedHistory };
      await setDoc(getFirebaseRef(), { data: updatedData }, { merge: true });
    } catch (e) { alert('삭제 실패'); }
  };

  const getProcessedVodLink = (link: string) => {
    if (!link) return '#';
    let processedLink = link.startsWith('http') ? link : `https://${link}`;
    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && processedLink.includes('vod.sooplive.com')) {
      processedLink = processedLink.replace('vod.sooplive.com/player', 'm.sooplive.co.kr/video');
    }
    return processedLink;
  };

  const sortedHistory = [...(wikiData.history || [])].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .history-card { transition: 0.3s; cursor: pointer; }
        .history-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(168,85,247,0.15) !important; border-color: #a855f7 !important; }
        .edit-overlay-btn { display: none; }
        .admin-mode .edit-overlay-btn { display: block; }
        .cab { background: rgba(255,255,255,0.9); border: 1px solid #ddd; border-radius: 8px; padding: 5px; cursor: pointer; font-size: 12px; transition: 0.2s; }
        .cab:hover { background: white; transform: scale(1.1); }
        .card-admin-btns { display: none; }
        .admin-mode .card-admin-btns { display: flex; }
        .sidebar-menu { display: flex; flex-direction: column; gap: 10px; width: 220px; flex-shrink: 0; }
        .menu-btn { padding: 15px 20px; border-radius: 12px; border: none; font-size: 16px; font-weight: bold; text-align: left; cursor: pointer; transition: 0.2s; background: transparent; color: #475569; }
        .menu-btn:hover { background: #f1f5f9; }
        .menu-btn.active { background: #a855f7; color: white; box-shadow: 0 4px 10px rgba(168, 85, 247, 0.3); }
        @media (max-width: 768px) {
          .wiki-layout { flex-direction: column !important; }
          .sidebar-menu { width: 100% !important; flex-direction: row !important; overflow-x: auto; padding-bottom: 10px; }
          .menu-btn { white-space: nowrap; }
          .profile-section-wrap { flex-direction: column !important; align-items: center !important; }
          .profile-info-wrap { width: 100% !important; border-left: none !important; padding-left: 0 !important; margin-left: 0 !important; }
        }
      `}} />

      <div style={{ backgroundColor: '#f8fafc', color: '#1e293b', minHeight: '100vh', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }} className={isAdmin ? 'admin-mode' : ''}>
        
        {isLoading && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fdfcff', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>위키를 불러오는 중입니다... 📖</div>
          </div>
        )}

        {/* 상단 네비게이션바 */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="https://event.img.sooplive.com/note_image/2026/08/31/37806a95605eda196.png" alt="몽나 로고" style={{ height: '40px', objectFit: 'contain' }} />
            </a>

            <div style={{ display: 'flex', gap: '30px', fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>
              <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>홈</a>
              <a href="/calendar" style={{ textDecoration: 'none', color: 'inherit' }}>캘린더</a>
              <a href="/song.html" style={{ textDecoration: 'none', color: 'inherit' }}>노래책</a>
              <a href="/reward.html" style={{ textDecoration: 'none', color: 'inherit' }}>업보(보상)</a>
              <a href="/vod.html" style={{ textDecoration: 'none', color: 'inherit' }}>VOD</a>
              <a href="/wiki" style={{ textDecoration: 'none', color: '#8b5cf6', borderBottom: '3px solid #8b5cf6', paddingBottom: '3px' }}>몽무위키</a>
            </div>

            <button onClick={toggleAdmin} style={{ padding: '8px 18px', borderRadius: '99px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: '1px solid transparent', background: isAdmin ? '#ffd700' : 'white', color: isAdmin ? '#333' : '#1e293b', border: isAdmin ? 'none' : '1px solid #ddd' }}>
              {isAdmin ? '👑 관리자 모드' : '🔒 관리자 로그인'}
            </button>
          </div>
        </nav>

        {/* 메인 레이아웃 (좌측 목차 + 우측 내용) */}
        <div className="wiki-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 100px', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* 좌측 사이드바 (목차) */}
          <div className="sidebar-menu">
            <h3 style={{ margin: '0 0 10px 10px', fontSize: '18px', color: '#0f172a' }}>📑 목차</h3>
            <button 
              className={`menu-btn ${activeTab === 'wiki' ? 'active' : ''}`}
              onClick={() => { playPageSound(); setActiveTab('wiki'); setCurrentPageIndex(0); }}
            >
              📖 1. 몽나 백과사전
            </button>
            <button 
              className={`menu-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => { playPageSound(); setActiveTab('history'); }}
            >
              📅 2. 몽나의 역사
            </button>
          </div>

          {/* 우측 콘텐츠 영역 */}
          <div style={{ flex: 1, width: '100%' }}>
            
            {/* 탭 1: 백과사전 */}
            {activeTab === 'wiki' && (
              <section className="profile-section-wrap" style={{ display: 'flex', gap: '40px', alignItems: 'stretch', background: '#ffffff', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', position: 'relative', minHeight: '500px' }}>
                <button className="edit-overlay-btn" onClick={openProfileEdit} style={{ position: 'absolute', top: '20px', left: '20px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#475569', zIndex: 10 }}>✏️ 편집</button>
                
                {/* 책 왼쪽 면 (프로필 사진) */}
                <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #eee', transform: 'rotate(-2deg)' }}>
                    <img src={wikiData.profile.image || 'https://stimg.afreecatv.com/LOGO/pi/pinktape8/pinktape8.jpg'} alt="프로필" style={{ width: '220px', height: '220px', objectFit: 'cover' }} onError={(e: any) => e.target.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} />
                    <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '15px 0 0 0', textAlign: 'center', color: '#333' }}>{wikiData.profile.name || '몽나_'}</h1>
                  </div>
                </div>
                
                {/* 책 가운데 접히는 그림자 선 */}
                <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)', boxShadow: '0 0 15px rgba(0,0,0,0.1)', margin: '0 10px' }}></div>
                
                {/* 책 오른쪽 면 (항목 내용 및 페이지네이션) */}
                <div className="profile-info-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: '10px', height: '100%', justifyContent: 'space-between' }}>
                  
                  {/* 페이지 분할 렌더링 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {wikiData.profile.sections && wikiData.profile.sections.length > 0 ? (
                      wikiData.profile.sections
                        .slice(currentPageIndex * ITEMS_PER_PAGE, (currentPageIndex + 1) * ITEMS_PER_PAGE)
                        .map((sec: any, idx: number) => (
                        <div key={idx}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                            {sec.title || '제목 없음'}
                          </h3>
                          <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', padding: '0 5px' }}>
                            {sec.content || '내용이 없습니다.'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#94a3b8' }}>등록된 항목이 없습니다.</div>
                    )}
                  </div>

                  {/* 페이지 넘기기 버튼 */}
                  {wikiData.profile.sections && wikiData.profile.sections.length > ITEMS_PER_PAGE && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px', paddingTop: '15px' }}>
                      <button 
                        disabled={currentPageIndex === 0}
                        onClick={() => { playPageSound(); setCurrentPageIndex(p => p - 1); }}
                        style={{ background: 'transparent', border: 'none', cursor: currentPageIndex === 0 ? 'default' : 'pointer', opacity: currentPageIndex === 0 ? 0.3 : 1, fontSize: '15px', fontWeight: 'bold', color: '#a855f7' }}
                      >
                        ◀ 이전
                      </button>
                      
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>
                        {currentPageIndex + 1} / {Math.ceil(wikiData.profile.sections.length / ITEMS_PER_PAGE)}
                      </span>

                      <button 
                        disabled={currentPageIndex >= Math.ceil(wikiData.profile.sections.length / ITEMS_PER_PAGE) - 1}
                        onClick={() => { playPageSound(); setCurrentPageIndex(p => p + 1); }}
                        style={{ background: 'transparent', border: 'none', cursor: currentPageIndex >= Math.ceil(wikiData.profile.sections.length / ITEMS_PER_PAGE) - 1 ? 'default' : 'pointer', opacity: currentPageIndex >= Math.ceil(wikiData.profile.sections.length / ITEMS_PER_PAGE) - 1 ? 0.3 : 1, fontSize: '15px', fontWeight: 'bold', color: '#a855f7' }}
                      >
                        다음 ▶
                      </button>
                    </div>
                  )}

                </div>
              </section>
            )}

            {/* 탭 2: 몽나의 역사 */}
            {activeTab === 'history' && (
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '3px solid #1e293b', paddingBottom: '15px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>📚 몽나의 역사 (타임라인)</h2>
                  {isAdmin && (
                    <button onClick={() => openCardEdit(null)} style={{ background: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ 새 기록 추가</button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {sortedHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1', padding: '40px', border: '1px dashed #cbd5e1', borderRadius: '20px' }}>아직 등록된 역사가 없습니다.<br/>관리자 로그인 후 첫 기록을 남겨보세요!</div>
                  ) : (
                    sortedHistory.map((card: any) => (
                      <div key={card.id} className="history-card" 
                        onClick={() => { playPageSound(); setViewModalData(card); }} // 🎵 카드 열 때 소리
                        style={{ background: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        
                        {card.thumb ? (
                          <img src={card.thumb} style={{ width: '100%', height: '160px', objectFit: 'cover', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} alt="썸네일" />
                        ) : (
                          <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f3e8ff, #e0e7ff)', fontSize: '40px', borderBottom: '1px solid #e2e8f0' }}>📅</div>
                        )}
                        
                        <div className="card-admin-btns" style={{ position: 'absolute', top: '10px', right: '10px', gap: '5px' }}>
                          <button className="cab" onClick={(e) => { e.stopPropagation(); openCardEdit(card.id); }}>✏️</button>
                          <button className="cab" onClick={(e) => deleteCard(card.id, e)}>🗑️</button>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#a855f7', background: '#f3e8ff', padding: '4px 10px', borderRadius: '8px', width: 'fit-content' }}>{card.date}</span>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, lineHeight: 1.4, wordBreak: 'keep-all' }}>{card.title}</h3>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* 3. 상세 팝업 (모달) */}
        {viewModalData && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }} 
               onClick={() => { playPageSound(); setViewModalData(null); }}> {/* 🎵 배경 클릭 닫을 때 소리 */}
            <div style={{ background: 'white', borderRadius: '24px', width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { playPageSound(); setViewModalData(null); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✕</button>
              
              {viewModalData.thumb && (
                <img src={viewModalData.thumb} style={{ width: '100%', height: '250px', objectFit: 'cover', background: '#f1f5f9' }} alt="커버" />
              )}
              
              <div style={{ padding: '35px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '14px', color: '#a855f7', fontWeight: 800 }}>{viewModalData.date}</div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, margin: 0, color: '#0f172a', lineHeight: 1.3 }}>{viewModalData.title}</h2>
                <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-wrap' }}>{viewModalData.desc || '상세 내용이 없습니다.'}</div>
                
                {viewModalData.vodLink && (
                  <a href={getProcessedVodLink(viewModalData.vodLink)} target="_blank" rel="noreferrer" style={{ background: '#ff4757', color: 'white', textAlign: 'center', padding: '15px', borderRadius: '16px', fontWeight: 'bold', textDecoration: 'none', fontSize: '16px', display: 'inline-block', boxShadow: '0 4px 15px rgba(255,71,87,0.3)', marginTop: '10px' }}>
                    📺 이 날 다시보기 시청
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 동적 프로필 편집 모달 */}
        {isProfileModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsProfileModalOpen(false)}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '550px', maxWidth: '90vw', padding: '30px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '15px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginTop: 0, color: '#a855f7' }}>✏️ 프로필 편집</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>이름 / 닉네임</label>
                <input type="text" value={epName} onChange={e => setEpName(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>프로필 사진 URL (비우면 기본 숲 프사)</label>
                <input type="text" value={epImg} onChange={e => setEpImg(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', margin: 0, color: '#475569' }}>항목 관리 (질문 및 답변)</h3>
                <button onClick={() => setEpSections([...epSections, { title: '', content: '' }])} style={{ background: '#f3e8ff', color: '#a855f7', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 항목 추가</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                {epSections.map((sec, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <input 
                        type="text" 
                        value={sec.title} 
                        onChange={(e) => {
                          const newSecs = [...epSections];
                          newSecs[idx].title = e.target.value;
                          setEpSections(newSecs);
                        }} 
                        placeholder="제목 (예: 몽나의 MBTI는?)" 
                        style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', outline: 'none' }} 
                      />
                      <button onClick={() => {
                          const newSecs = epSections.filter((_, i) => i !== idx);
                          setEpSections(newSecs);
                        }} 
                        style={{ background: '#ff4757', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer' }}>삭제</button>
                    </div>
                    <textarea 
                      value={sec.content} 
                      onChange={(e) => {
                        const newSecs = [...epSections];
                        newSecs[idx].content = e.target.value;
                        setEpSections(newSecs);
                      }} 
                      placeholder="내용을 입력하세요" 
                      style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', height: '80px', resize: 'none', outline: 'none' }} 
                    />
                  </div>
                ))}
              </div>
              
              <button onClick={saveProfile} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>저장하기</button>
            </div>
          </div>
        )}

        {/* 카드 추가/수정 모달 */}
        {isCardModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsCardModalOpen(false)}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '500px', maxWidth: '90vw', padding: '30px', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '15px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginTop: 0, color: '#a855f7' }}>{ecId ? '기록 수정하기' : '새 기록 추가'}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>제목 (예: 몽나 첫 방송!)</label>
                <input type="text" value={ecTitle} onChange={e => setEcTitle(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>날짜 (예: 2024.03.05)</label>
                <input type="text" value={ecDate} onChange={e => setEcDate(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>썸네일 이미지 URL (선택)</label>
                <input type="text" value={ecThumb} onChange={e => setEcThumb(e.target.value)} placeholder="사진 링크를 넣으면 예쁜 카드가 됩니다" style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>상세 내용 (비하인드 썰 등)</label>
                <textarea value={ecDesc} onChange={e => setEcDesc(e.target.value)} placeholder="팝업창을 띄웠을 때 보일 자세한 내용을 적어주세요" style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none', height: '120px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>📺 다시보기(VOD) 링크 (선택)</label>
                <input type="text" value={ecVod} onChange={e => setEcVod(e.target.value)} placeholder="https://..." style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
              </div>
              
              <button onClick={saveCard} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>기록 저장하기</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
