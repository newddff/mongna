'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type Stream = {
  id: string;
  broadcastId?: string;
  startedAt?: string;
  endedAt?: string | null;
  isLive?: boolean;
  title?: string;
  category?: string;
  thumbnail?: string;
  durationMinutes?: number | null;
  maxViewers?: number;
  avgViewers?: number;
  viewerSamples?: { timestamp: string; viewers: number }[];
  titleChanges?: { timestamp: string; before: string; after: string }[];
  categoryChanges?: { timestamp: string; before: string; after: string }[];
};
type BroadStatus = {
  isLive?: boolean;
  activeBroadcastId?: string | null;
  title?: string;
  category?: string;
  viewers?: number;
  favorCnt?: number;
  updatedAt?: string;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const kstParts = (ms: number) => new Date(ms + KST_OFFSET_MS);
const kstMonth = (ms: number) => {
  const d = kstParts(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const timestampMs = (value?: string | null) => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
const formatKstTime = (value?: string) => {
  const ms = timestampMs(value);
  if (ms === null) return '시간 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms));
};
const getInterval = (s: Stream, nowMs: number): [number, number] | null => {
  const start = timestampMs(s.startedAt);
  if (start === null) return null;
  const end = timestampMs(s.endedAt);
  // 종료 시각이 없는 과거 기록을 현재까지 진행 중인 것으로 오해하지 않기
  const actualEnd = end !== null ? end : s.isLive ? nowMs : start + Math.max(0, Number(s.durationMinutes) || 0) * MINUTE_MS;
  return [start, Math.max(start, Math.min(actualEnd, nowMs))];
};

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => kstMonth(Date.now()));
  const [allStreams, setAllStreams] = useState<Stream[]>([]);
  const [status, setStatus] = useState<BroadStatus | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    try { setIsDarkMode(window.localStorage.getItem('mongna_dashboard_dark') === 'true'); } catch { /* storage unavailable */ }
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try { window.localStorage.setItem('mongna_dashboard_dark', String(next)); } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    const unsubscribeStreams = onSnapshot(
      query(collection(db, 'mongna_streams'), orderBy('startedAt', 'desc')),
      snap => {
        setAllStreams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stream)));
        setError('');
        setLoading(false);
      },
      err => { console.error('방송 기록 조회 실패:', err); setError('방송 기록을 불러오지 못했습니다. Firestore 읽기 권한과 네트워크를 확인해 주세요.'); setLoading(false); }
    );
    const unsubscribeStatus = onSnapshot(
      doc(db, 'mongna_calendar_data', 'broad_status'),
      snap => setStatus(snap.exists() ? snap.data() as BroadStatus : null),
      err => { console.error('현재 방송 상태 조회 실패:', err); setError(prev => prev || '현재 방송 상태를 불러오지 못했습니다.'); }
    );
    return () => { unsubscribeStreams(); unsubscribeStatus(); };
  }, []);

  const { stats, streams, heatmap, daysInMonth, maxHeat } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = Date.UTC(year, month - 1, 1) - KST_OFFSET_MS;
    const monthEnd = Date.UTC(year, month, 1) - KST_OFFSET_MS;
    const selected = allStreams.filter(s => {
      const start = timestampMs(s.startedAt);
      return start !== null && start >= monthStart && start < monthEnd;
    });
    const heatmap = Array.from({ length: 24 }, () => Array<number>(daysInMonth).fill(0));
    const broadcastDays = new Set<number>();
    let durationMs = 0;
    let maxViewers = 0;
    let sumWeightedViewers = 0;
    let totalSamples = 0;

    for (const stream of allStreams) {
      const interval = getInterval(stream, nowMs);
      if (!interval) continue;
      const [start, end] = interval;
      const from = Math.max(start, monthStart);
      const to = Math.min(end, monthEnd);
      if (to <= from) continue;
      durationMs += to - from;
      // 날짜/시각 단위의 실제 방송 시간(분)을 누적한다.
      let cursor = from;
      while (cursor < to) {
        const local = kstParts(cursor);
        const hour = local.getUTCHours();
        const day = local.getUTCDate() - 1;
        const nextHour = (Math.floor((cursor + KST_OFFSET_MS) / HOUR_MS) + 1) * HOUR_MS - KST_OFFSET_MS;
        const stepEnd = Math.min(to, nextHour);
        const minutes = (stepEnd - cursor) / MINUTE_MS;
        heatmap[hour][day] += minutes;
        broadcastDays.add(day);
        cursor = stepEnd;
      }
    }
    for (const stream of selected) {
      maxViewers = Math.max(maxViewers, Number(stream.maxViewers) || 0);
      const samples = Array.isArray(stream.viewerSamples) ? stream.viewerSamples : [];
      if (samples.length) {
        for (const sample of samples) {
          const count = Number(sample.viewers);
          if (Number.isFinite(count) && count >= 0) { sumWeightedViewers += count; totalSamples++; }
        }
      } else if (Number.isFinite(Number(stream.avgViewers))) {
        sumWeightedViewers += Number(stream.avgViewers) || 0;
        totalSamples++;
      }
    }
    return {
      daysInMonth,
      streams: selected,
      heatmap,
      maxHeat: Math.max(1, ...heatmap.flat()),
      stats: {
        totalDays: broadcastDays.size,
        totalCount: selected.length,
        totalDurationMin: Math.round(durationMs / MINUTE_MS),
        maxViewers,
        avgViewers: totalSamples ? Math.round(sumWeightedViewers / totalSamples) : 0
      }
    };
  }, [allStreams, selectedMonth, nowMs]);

  const [year, month] = selectedMonth.split('-');
  const shell = isDarkMode ? 'bg-[linear-gradient(150deg,#191424_0%,#241b34_55%,#21182c_100%)] text-[#F8F1FF]' : 'bg-[linear-gradient(145deg,#FCF8FF_0%,#F7F3FF_55%,#FFF8FC_100%)] text-[#453957]';
  const card = isDarkMode ? 'bg-[#2D243B]/95 border border-[#59466D]' : 'bg-white/90 border border-[#EEE1FA]';
  const muted = isDarkMode ? 'text-[#BFAED0]' : 'text-[#8C7B9F]';
  const panel = isDarkMode ? 'bg-[#261E34] border-[#514162]' : 'bg-[#FCF9FF] border-[#EEE2F9]';
  const numberText = isDarkMode ? 'text-[#F9F3FF]' : 'text-[#433655]';
  const viewerNumber = (value: unknown) => (Number(value) || 0).toLocaleString('ko-KR');
  const fanCount = typeof status?.favorCnt === 'number' && Number.isFinite(status.favorCnt) && status.favorCnt > 0
    ? status.favorCnt.toLocaleString('ko-KR') + '명' : '확인 불가';

  return (
    <div className={`min-h-screen p-4 sm:p-8 font-sans transition-colors duration-200 ${shell}`}>
      <header className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4 mb-7">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-[56px] w-[102px] sm:h-[68px] sm:w-[128px] shrink-0 items-center justify-center rounded-2xl border border-[#EEE1FA] bg-white px-2.5 py-2 shadow-[0_6px_24px_rgba(138,99,182,0.10)]">
            <Image src="/logo-new.png" alt="몽나 로고" width={1828} height={860} priority className="max-h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-medium ${isDarkMode ? 'text-[#C6A9ED]' : 'text-[#A084C5]'}`}>MONGNA · BROADCAST</p>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">몽나 월별 방송 현황판</h1>
          </div>
        </div>
        <button type="button" onClick={toggleTheme} aria-pressed={isDarkMode}
          className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold shadow-sm border transition-colors ${isDarkMode ? 'bg-[#3B304B] border-[#6B5483] hover:bg-[#473858] text-[#F4E8FF]' : 'bg-white/90 border-[#EADAFB] hover:bg-[#F7EFFF] text-[#755D99]'}`}>
          {isDarkMode ? '☀️ 라이트 모드' : '🌙 다크 모드'}
        </button>
      </header>

      <div className={`max-w-6xl mx-auto rounded-[22px] p-4 sm:p-5 mb-6 shadow-[0_8px_28px_rgba(119,85,157,0.06)] flex flex-wrap items-center gap-3 ${card}`}>
        {status?.isLive ? (
          <><span className="bg-[#EF657B] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">● ON AIR</span>
            <span className="text-sm font-medium break-words">{status.title || '방송 중'} <span className={muted}>· {status.category || '카테고리 없음'} · 👁 {viewerNumber(status.viewers)}명</span></span></>
        ) : (
          <><span className={`px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-[#41374f] text-violet-200' : 'bg-[#F4ECFA] text-[#87709E]'}`}>OFFLINE</span>
            <span className={`text-sm ${muted}`}>현재 진행 중인 방송이 없습니다.</span></>
        )}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className={`${card} rounded-[24px] p-5 sm:p-6 shadow-[0_8px_30px_rgba(122,88,171,0.06)] md:sticky md:top-8`}>
            <h2 className="text-lg font-bold mb-4">🗓️ {year}년</h2>
            <input type="month" value={selectedMonth} min="2026-10" max={kstMonth(nowMs)} onChange={e => { if (e.target.value) setSelectedMonth(e.target.value); }}
              aria-label="통계를 볼 연도와 월" className="w-full bg-[linear-gradient(120deg,#A88AEF,#D6A6E8)] text-white font-bold text-center rounded-xl py-3 px-2 focus:outline-none focus:ring-4 focus:ring-[#E9DAFF] cursor-pointer shadow-sm" />
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <section className={`${card} rounded-[24px] p-5 sm:p-8 shadow-[0_8px_30px_rgba(122,88,171,0.06)]`}>
            <h3 className="text-lg sm:text-xl font-bold mb-6">📈 {Number(month)}월 방송 통계 & 분포도</h3>
            {error && <p role="alert" className="mb-5 text-sm text-red-500">{error}</p>}
            {loading && <p className={`mb-5 text-sm ${muted}`}>방송 기록 불러오는 중...</p>}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {[
                ['🗓️ 방송 일수', `${stats.totalDays}일 / ${daysInMonth}일`],
                ['🎬 방송 횟수', `${stats.totalCount}회`],
                ['🕒 총 방송 시간', `${Math.floor(stats.totalDurationMin / 60)}시간 ${stats.totalDurationMin % 60}분`],
                ['⭐ 현재 애청자', fanCount],
                ['⬆️ 최고 시청자', `${viewerNumber(stats.maxViewers)}명`],
                ['📊 평균 시청자', `${viewerNumber(stats.avgViewers)}명`]
              ].map(([label, value]) => (
                <div key={label} className={`min-w-0 rounded-2xl border px-3 py-4 sm:px-4 sm:py-5 text-center ${isDarkMode ? 'bg-[#352941] border-[#59466D]' : 'bg-[#FCF9FF] border-[#EEE3F9]'}`}>
                  <p className={`text-xs sm:text-sm mb-2 ${muted}`}>{label}</p>
                  <p className={`text-lg sm:text-xl break-words ${label.includes('애청자') ? 'font-semibold' : 'font-bold'} ${label.includes('애청자') ? (isDarkMode ? 'text-[#D7C6E7]' : 'text-[#665779]') : numberText}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className={`rounded-2xl border p-3 sm:p-5 ${panel}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <strong className="text-sm">🪻 날짜·시간별 방송 분포</strong>
                <span className={`text-xs ${muted}`}>한국 시간 · 진할수록 오래 방송</span>
              </div>
              <div className="overflow-x-auto pb-1">
                <div className="min-w-[570px]">
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: `36px repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <React.Fragment key={`hour-${hour}`}>
                        <span className={`text-[10px] text-right pr-2 leading-[15px] ${muted}`}>{hour % 3 === 0 ? `${String(hour).padStart(2, '0')}시` : ''}</span>
                        {heatmap[hour].map((minutes, day) => (
                          <div key={`${hour}-${day}`} role="img" aria-label={`${day + 1}일 ${hour}시 ${Math.round(minutes)}분 방송`}
                            title={`${Number(month)}월 ${day + 1}일 ${String(hour).padStart(2, '0')}시: 약 ${Math.round(minutes)}분 방송`}
                            className={`h-[15px] rounded-[3px] ${minutes === 0 ? (isDarkMode ? 'bg-[#463952]' : 'bg-[#EDE7F3]') : ''}`}
                            style={minutes > 0 ? { backgroundColor: `rgba(174, 119, 222, ${0.30 + 0.70 * minutes / maxHeat})` } : undefined} />
                        ))}
                      </React.Fragment>
                    ))}
                    <span />
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <span key={`day-${i}`} className={`text-[9px] text-center ${muted}`}>{i === 0 || (i + 1) % 5 === 0 || i === daysInMonth - 1 ? i + 1 : ''}</span>
                    ))}
                  </div>
                </div>
              </div>
              {!loading && maxHeat === 1 && heatmap.every(row => row.every(minutes => minutes === 0)) &&
                <p className={`text-xs mt-4 text-center ${muted}`}>선택한 월에 기록된 방송 시간이 없습니다.</p>}
            </div>
          </section>

          <section className={`${card} rounded-[24px] p-5 sm:p-8 shadow-[0_8px_30px_rgba(122,88,171,0.06)]`}>
            <h3 className="text-lg sm:text-xl font-bold mb-6">📝 상세 타임라인 내역</h3>
            {streams.length === 0 ? (
              <div className="py-12 text-center"><p className="text-[#A588F8] font-medium">{loading ? '불러오는 중...' : '해당 월에는 기록된 방송이 없습니다.'}</p></div>
            ) : (
              <div className="space-y-4">{streams.map(stream => (
                <div key={stream.id} className={`rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row gap-4 hover:shadow-[0_8px_24px_rgba(126,82,158,0.08)] transition-shadow ${panel}`}>
                  {stream.thumbnail && <div className="flex-shrink-0"><img src={stream.thumbnail} alt="방송 썸네일" className="w-full md:w-40 object-cover rounded-lg" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <h4 className="font-bold text-lg break-words">{stream.title || '제목 없음'} {stream.isLive && <span className="inline-block align-middle bg-red-500 text-white text-xs px-2 py-1 rounded">LIVE</span>}</h4>
                      <span className={`text-sm shrink-0 ${muted}`}>{formatKstTime(stream.startedAt)}</span>
                    </div>
                    <div className={`flex flex-wrap gap-3 text-sm mb-3 ${muted}`}>
                      <span className={isDarkMode ? 'text-[#D8B7F4]' : 'text-[#916BBF]'}>{stream.category || '카테고리 없음'}</span>
                      <span>최고 {viewerNumber(stream.maxViewers)}명</span>
                      <span>평균 {viewerNumber(stream.avgViewers)}명</span>
                      <span>{Math.round(((getInterval(stream, nowMs)?.[1] || 0) - (getInterval(stream, nowMs)?.[0] || 0)) / MINUTE_MS)}분 진행</span>
                    </div>
                    {(!!stream.titleChanges?.length || !!stream.categoryChanges?.length) && (
                      <div className={`mt-4 pt-4 border-t text-xs space-y-1.5 ${isDarkMode ? 'border-[#59466D] text-[#C6B6D7]' : 'border-[#EADCF7] text-[#8C7B9F]'}`}>
                        {stream.titleChanges?.map((t, i) => <p key={`t-${i}`}>🕒 {formatKstTime(t.timestamp)}: 제목 변경 ({t.before} ➔ {t.after})</p>)}
                        {stream.categoryChanges?.map((c, i) => <p key={`c-${i}`}>🕒 {formatKstTime(c.timestamp)}: 카테고리 변경 ({c.before} ➔ {c.after})</p>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
