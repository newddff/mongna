"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // 💡 파이어베이스 경로가 다를 경우 이 부분을 수정해 주세요 (예: '../../lib/firebase')

export default function Dashboard() {
  // ==========================================
  // 1. 상태(State) 관리
  // ==========================================
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [streams, setStreams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    totalCount: 0,
    totalDurationMin: 0,
    maxViewers: 0,
    avgViewers: 0,
  });

  // ==========================================
  // 2. 파이어베이스 데이터 조회 및 통계 계산 로직
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'mongna_streams'), orderBy('startedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const fetchedStreams: any[] = [];
        snapshot.forEach((doc) => {
          fetchedStreams.push({ id: doc.id, ...doc.data() });
        });

        // 선택된 월(selectedMonth)에 해당하는 데이터만 필터링
        const filteredStreams = fetchedStreams.filter((stream) => {
          if (!stream.startedAt) return false;
          return stream.startedAt.startsWith(selectedMonth);
        });

        setStreams(filteredStreams);

        // 통계 계산 (일수, 횟수, 최고/평균 시청자, 총 시간)
        const daysSet = new Set();
        let durationMin = 0;
        let maxV = 0;
        let sumAvgV = 0;

        filteredStreams.forEach((s) => {
          if (s.startedAt) {
            daysSet.add(s.startedAt.substring(0, 10)); // YYYY-MM-DD 추출
          }
          durationMin += (Number(s.durationMinutes) || 0);
          if (Number(s.maxViewers) > maxV) maxV = Number(s.maxViewers);
          sumAvgV += (Number(s.avgViewers) || 0);
        });

        setStats({
          totalDays: daysSet.size, // 방송한 날짜 수
          totalCount: filteredStreams.length, // 총 방송 횟수
          totalDurationMin: durationMin,
          maxViewers: maxV,
          avgViewers: filteredStreams.length > 0 ? Math.round(sumAvgV / filteredStreams.length) : 0
        });

      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // ==========================================
  // 3. 시간 계산 및 포맷 헬퍼 함수
  // ==========================================
  const getLiveDurationMinutes = (stream: any) => {
    if (!stream.startedAt) return 0;
    const start = new Date(stream.startedAt).getTime();
    const now = new Date().getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(0, Math.round((now - start) / 60000));
  };

  const extractTime = (timestamp: string) => {
    if (!timestamp) return '시간 정보 없음';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '시간 정보 없음';
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0시는 12시로 표시
    
    return `${ampm} ${hours}:${minutes}`;
  };

  // ==========================================
  // 4. 월별 전체 일수 계산 (UI 표시용 - 💡 반드시 return 직전에 위치!)
  // ==========================================
  const [year, month] = selectedMonth.split('-');
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

  // ==========================================
  // 5. UI 디자인 렌더링 (JSX)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 sm:p-8 text-gray-800 font-sans">
      
      {/* 상단 헤더 영역 */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-xl">✨</span> 몽나 월별 방송 현황판
        </h1>
        <button className="bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
          🌙 다크 모드
        </button>
      </header>

      {/* 라이브 상태 배너 (현재는 기본 오프라인 UI, 추후 실시간 연동 공간) */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl p-4 mb-6 shadow-sm flex items-center gap-4">
        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold tracking-wide">OFFLINE</span>
        <span className="text-gray-600 text-sm font-medium">현재 진행 중인 방송이 없습니다.</span>
      </div>

      {/* 메인 레이아웃 (좌측 메뉴 + 우측 콘텐츠) */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* 👉 좌측 사이드바 (연도/월 선택) */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold mb-4">
              {selectedMonth ? `${year}년` : '연도 선택'}
            </h2>
            <div className="relative">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#A588F8] text-white font-bold text-center rounded-xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-purple-200 cursor-pointer transition-shadow"
              />
            </div>
          </div>
        </aside>

        {/* 👉 우측 메인 콘텐츠 */}
        <main className="flex-1 space-y-6">
          
          {/* [카드 1] 월별 통계 & 분포도 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              📈 {selectedMonth ? `${month}월` : ''} 방송 통계 & 분포도
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-center mb-10">
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">🗓️ 방송 일수</p>
                <p className="text-2xl font-bold text-gray-800">
                  <span className="text-orange-500 text-xl mr-1">🏆</span> 
                  {stats.totalDays}일 <span className="text-gray-400 text-sm font-normal">/ {daysInMonth}일</span>
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">🎬 방송 횟수</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalCount}회</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">🕒 총 방송 시간</p>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.floor(stats.totalDurationMin / 60)}시간 {stats.totalDurationMin % 60}분
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">⭐ 애청자</p>
                <p className="text-2xl font-bold text-gray-800">- 명</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">⬆️ 최고 시청자</p>
                <p className="text-2xl font-bold text-gray-800">{stats.maxViewers}명</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2 flex justify-center items-center gap-1">📊 평균 시청자</p>
                <p className="text-2xl font-bold text-gray-800">{stats.avgViewers}명</p>
              </div>
            </div>

            {/* 분포도 차트 자리 (디자인 영역만 유지) */}
            <div className="w-full h-64 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">분포도 차트 영역 (준비 중)</span>
            </div>
          </div>

          {/* [카드 2] 상세 타임라인 내역 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              📝 상세 타임라인 내역
            </h3>
            
            {streams.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[#A588F8] font-medium">해당 월에는 기록된 타임라인이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {streams.map((stream) => (
                  <div key={stream.broadcastId} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors bg-gray-50/50 flex flex-col md:flex-row gap-5">
                    
                    {/* 썸네일 영역 */}
                    {stream.thumbnail && (
                      <div className="flex-shrink-0">
                        <img 
                          src={stream.thumbnail} 
                          alt="방송 썸네일" 
                          className="w-full md:w-40 h-auto object-cover rounded-lg border border-gray-200" 
                        />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                        <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                          {stream.title}
                          {/* LIVE 뱃지 */}
                          {stream.isLive && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse shadow-sm">LIVE</span>
                          )}
                        </h4>
                        <span className="text-sm text-gray-500 mt-1 sm:mt-0 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                          {stream.startedAt ? extractTime(stream.startedAt) : '시간 정보 없음'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                          {stream.category || '카테고리 없음'}
                        </span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">최고 {stream.maxViewers || 0}명</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">평균 {stream.avgViewers || 0}명</span>
                        <span className="bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded">
                          {stream.isLive ? getLiveDurationMinutes(stream) : stream.durationMinutes || 0}분 진행
                        </span>
                      </div>
                      
                      {/* 제목 및 카테고리 변경 이력 */}
                      {(stream.titleChanges?.length > 0 || stream.categoryChanges?.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1.5 bg-white p-3 rounded-md">
                          {stream.titleChanges?.map((tc: any, idx: number) => (
                            <div key={`title-${idx}`}>🕒 {extractTime(tc.timestamp)}: 제목 변경 ({tc.before} ➔ <span className="font-medium text-gray-700">{tc.after}</span>)</div>
                          ))}
                          {stream.categoryChanges?.map((cc: any, idx: number) => (
                            <div key={`cate-${idx}`}>🕒 {extractTime(cc.timestamp)}: 카테고리 변경 ({cc.before} ➔ <span className="font-medium text-gray-700">{cc.after}</span>)</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}