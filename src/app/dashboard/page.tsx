'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // 💡 본인 경로에 맞게 수정

export default function Dashboard() {
  // 1. 사용자 PC 시간이 아닌 KST(한국 표준시) 기준으로 완벽하게 이번 달 설정
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;

    return `${year}-${month}`;
  });
  
  const [streams, setStreams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDays: 0, totalCount: 0, 
    maxViewers: 0, avgViewers: 0
  });
  const [loading, setLoading] = useState(true);
  
  // 라이브 방송 시간 실시간 갱신용 Trigger (1분마다)
  const [nowTrigger, setNowTrigger] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowTrigger(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        
        const startKst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+09:00`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonthKst = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000+09:00`;

        const streamsRef = collection(db, 'mongna_streams');
        const q = query(
          streamsRef,
          where("startedAt", ">=", startKst),
          where("startedAt", "<", nextMonthKst),
          orderBy("startedAt", "desc")
        );

        const snap = await getDocs(q);
        const fetchedStreams: any[] = [];
        const uniqueDays = new Set<string>();
        
        let globalMaxViewers = 0;
        let totalViewersSum = 0;
        let totalViewerSamplesCount = 0;

        snap.forEach(doc => {
          const data = doc.data();
          const safeStream = {
            ...data,
            durationMinutes: Number(data.durationMinutes) || 0,
            maxViewers: Number(data.maxViewers) || 0,
            avgViewers: Number(data.avgViewers) || 0,
            viewerSamples: Array.isArray(data.viewerSamples) ? data.viewerSamples : [],
            titleChanges: Array.isArray(data.titleChanges) ? data.titleChanges : [],
            categoryChanges: Array.isArray(data.categoryChanges) ? data.categoryChanges : []
          };
          fetchedStreams.push(safeStream);
          
          if (safeStream.startedAt) {
            uniqueDays.add(safeStream.startedAt.substring(0, 10)); 
          }
          
          if (safeStream.maxViewers > globalMaxViewers) globalMaxViewers = safeStream.maxViewers;

          safeStream.viewerSamples.forEach((sample: any) => {
            totalViewersSum += (Number(sample.viewers) || 0);
            totalViewerSamplesCount += 1;
          });
        });

        setStreams(fetchedStreams);
        setStats({
          totalDays: uniqueDays.size,
          totalCount: fetchedStreams.length,
          maxViewers: globalMaxViewers,
          avgViewers: totalViewerSamplesCount > 0 ? Math.round(totalViewersSum / totalViewerSamplesCount) : 0,
        });

      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [selectedMonth]); // 💡 nowTrigger를 dependency에 넣지 않아 불필요한 DB 읽기 방지

  // UI 헬퍼 함수들
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes < 0) return '0분';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  };

  const getLiveDurationMinutes = (stream: any) => {
    if (!stream.startedAt) return 0;
    const start = new Date(stream.startedAt).getTime();
    const end = stream.isLive ? nowTrigger : new Date(stream.endedAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    return Math.max(0, Math.round((end - start) / 60000));
  };

  const extractTime = (isoString: string) => {
    if (!isoString) return '';
    return isoString.substring(11, 16);
  };

  // 💡 월간 총 방송 시간 실시간 계산
  const totalDurationMin = streams.reduce((sum, stream) => {
    return sum + (stream.isLive ? getLiveDurationMinutes(stream) : stream.durationMinutes);
  }, 0);

  // 💡 2. 평균 방송 시간 추가 계산
  const avgDurationMin = stats.totalCount > 0 ? Math.round(totalDurationMin / stats.totalCount) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* 📅 월 선택기 */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow border">
        <label htmlFor="month-select" className="font-bold text-gray-700">조회 월 선택:</label>
        <input 
          type="month" id="month-select" value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 font-bold text-gray-500">데이터를 불러오는 중입니다...</div>
      ) : (
        <>
          {/* 📊 월별 통계 */}
          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📊 {selectedMonth} 월별 통계</h2>
            {/* 💡 카드가 6개가 되었으므로 grid 구조가 딱 맞아떨어짐 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">방송 일수</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalDays}일</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">방송 횟수</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalCount}회</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">총 방송 시간</p>
                <p className="text-2xl font-bold text-blue-700">{formatDuration(totalDurationMin)}</p>
              </div>
              
              {/* 💡 평균 방송 시간 카드 추가 */}
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">평균 방송 시간</p>
                <p className="text-2xl font-bold text-blue-700">{formatDuration(avgDurationMin)}</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">월간 최고 시청자</p>
                <p className="text-2xl font-bold text-red-600">{stats.maxViewers.toLocaleString()}명</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 font-semibold mb-1">월간 평균 시청자</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgViewers.toLocaleString()}명</p>
              </div>
            </div>
          </div>

          {/* 🎥 개별 방송 세션 목록 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 ml-2">📝 방송 아카이브</h2>
            
            {streams.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl shadow border text-gray-500">해당 월의 방송 기록이 없습니다.</div>
            ) : (
              streams.map((stream) => (
                <div key={stream.broadcastId} className={`p-5 rounded-xl shadow border hover:shadow-md transition-shadow ${stream.isLive ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {stream.startedAt?.substring(0, 10)}
                      </span>
                      <span className="text-gray-600 font-medium">
                        {extractTime(stream.startedAt)} ~ {stream.endedAt ? extractTime(stream.endedAt) : <span className="text-red-500 animate-pulse font-bold">방송중</span>} 
                      </span>
                    </div>
                    <div className={`mt-2 md:mt-0 font-bold ${stream.isLive ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                      ⏱ {formatDuration(stream.isLive ? getLiveDurationMinutes(stream) : stream.durationMinutes)}
                    </div>
                  </div>

                  <div className="flex space-x-4 mb-4">
                    {stream.thumbnail && (
                      <img src={stream.thumbnail} alt="방송 썸네일" className="w-32 h-20 object-cover rounded-lg shadow-sm" />
                    )}
                    <div className="flex flex-col justify-center">
                      <p className="font-semibold text-blue-500 text-sm mb-1">[{stream.category}]</p>
                      <p className="text-gray-900 font-bold text-lg leading-tight">{stream.title}</p>
                    </div>
                  </div>

                  <div className="flex space-x-6 mb-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700 font-medium">📈 최고 시청자: <span className="font-bold text-red-500">{stream.maxViewers.toLocaleString()}명</span></p>
                    <p className="text-gray-700 font-medium">📊 평균 시청자: <span className="font-bold text-green-600">{stream.avgViewers.toLocaleString()}명</span></p>
                  </div>

                  {stream.titleChanges.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
                      {stream.titleChanges.map((change: any, idx: number) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <p className="text-blue-700 font-semibold mb-1">{extractTime(change.timestamp)} ✏️ 방송 제목 변경</p>
                          <div className="pl-2 border-l-2 border-blue-300">
                            <p className="line-through text-gray-500">{change.before}</p>
                            <p className="text-gray-900 font-bold">→ {change.after}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {stream.categoryChanges.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm border border-purple-100">
                      {stream.categoryChanges.map((change: any, idx: number) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <p className="text-purple-700 font-semibold mb-1">{extractTime(change.timestamp)} 🗂️ 카테고리 변경</p>
                          <div className="pl-2 border-l-2 border-purple-300">
                            <p className="line-through text-gray-500">{change.before}</p>
                            <p className="text-gray-900 font-bold">→ {change.after}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
