'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function Dashboard() {
  const [status, setStatus] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ totalMinutes: 0, maxViewers: 0, avgViewers: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const startYear = 2026;
  const startMonth = 10;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const availableMonths: string[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const mStart = (y === startYear) ? startMonth : 1;
    const mEnd = (y === currentYear) ? currentMonth : 12;
    for (let m = mStart; m <= mEnd; m++) {
      availableMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  availableMonths.reverse();

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]);

  useEffect(() => {
    // 1. 현재 방송 상태
    const statusRef = doc(db, 'mongna_calendar_data', 'broad_status');
    const unsubscribeStatus = onSnapshot(statusRef, (docSnap) => {
      if (docSnap.exists()) setStatus(docSnap.data());
    });

    // 2. 타임라인 기록
    const timelineRef = collection(db, 'mongna_timeline');
    const startOfMonth = `${selectedMonth}-01T00:00:00.000Z`;
    const endOfMonth = `${selectedMonth}-31T23:59:59.999Z`;
    
    const qTimeline = query(
      timelineRef, 
      where('timestamp', '>=', startOfMonth),
      where('timestamp', '<=', endOfMonth),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeTimeline = onSnapshot(qTimeline, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTimeline(logs);
    });

    // 3. 월별 시청자 통계 및 방송 시간
    const viewersRef = collection(db, 'mongna_live_viewers');
    const qViewers = query(
      viewersRef,
      where('date', '>=', `${selectedMonth}-01`),
      where('date', '<=', `${selectedMonth}-31`)
    );

    const unsubscribeViewers = onSnapshot(qViewers, (snapshot) => {
      let totalMin = 0;
      let maxV = 0;
      let sumV = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.logs && Array.isArray(data.logs)) {
          totalMin += data.logs.length;
          data.logs.forEach((log: any) => {
            if (log.viewers > maxV) maxV = log.viewers;
            sumV += log.viewers;
          });
        }
      });

      setMonthlyStats({
        totalMinutes: totalMin,
        maxViewers: maxV,
        avgViewers: totalMin > 0 ? Math.round(sumV / totalMin) : 0
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeTimeline();
      unsubscribeViewers();
    };
  }, [selectedMonth]);

  const groupedTimeline = timeline.reduce((groups, log) => {
    const date = log.timestamp.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  const groupedNav = availableMonths.reduce((acc, ym) => {
    const [y, m] = ym.split('-');
    if (!acc[y]) acc[y] = [];
    acc[y].push(m);
    return acc;
  }, {} as Record<string, string[]>);

  // 그래프(히트맵)용 데이터
  const [selYear, selMon] = selectedMonth.split('-');
  const daysInMonth = new Date(Number(selYear), Number(selMon), 0).getDate();
  const heatmapData = Array.from({ length: 24 }, () => Array(daysInMonth).fill(0));
  const activeDays = new Set();

  timeline.forEach(log => {
    const d = new Date(log.timestamp);
    const day = d.getDate() - 1;
    const hour = d.getHours();
    heatmapData[hour][day] += 1;
    activeDays.add(day);
  });

  const colors = {
    bg: isDarkMode ? '#1a1625' : '#f8f6fb',
    cardBg: isDarkMode ? '#2d2438' : '#ffffff',
    text: isDarkMode ? '#f3e8ff' : '#2d3748',
    textMuted: isDarkMode ? '#a78bfa' : '#8b5cf6',
    border: isDarkMode ? '#4c3e66' : '#ede9fe',
    primary: isDarkMode ? '#8b5cf6' : '#a78bfa',
    graphActive: isDarkMode ? '#34d399' : '#10b981',
    graphEmpty: isDarkMode ? '#3b2f4a' : '#f3f4f6',
    statLabel: isDarkMode ? '#9ca3af' : '#6b7280',
  };

  const styles = {
    container: { minHeight: '100vh', backgroundColor: colors.bg, padding: '2rem', fontFamily: 'sans-serif', color: colors.text, transition: 'all 0.3s ease' },
    wrapper: { maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '1.5rem' },
    
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' },
    titleBox: { display: 'flex', alignItems: 'center', gap: '12px' },
    logo: { height: '38px', filter: isDarkMode ? 'invert(1) drop-shadow(0 0 2px rgba(255,255,255,0.3))' : 'none', transition: '0.3s' },
    title: { fontSize: '1.8rem', fontWeight: 'bold', margin: 0 },
    themeBtn: { padding: '0.6rem 1.2rem', borderRadius: '30px', border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg, color: colors.text, cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
    
    card: { backgroundColor: colors.cardBg, borderRadius: '1rem', padding: '1.5rem', boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 15px rgba(139, 92, 246, 0.08)', border: `1px solid ${colors.border}`, transition: 'all 0.3s ease' },
    
    compactStatusLine: { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.8rem 1.5rem', backgroundColor: colors.cardBg, borderRadius: '0.8rem', border: `1px solid ${colors.border}`, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(139,92,246,0.05)' },
    badgeOn: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold', animation: 'pulse 2s infinite' },
    badgeOff: { backgroundColor: isDarkMode ? '#4c3e66' : '#f3f4f6', color: isDarkMode ? '#e2e8f0' : '#4b5563', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' },
    statusText: { fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', gap: '1rem' },
    
    layoutRow: { display: 'flex', gap: '2rem', alignItems: 'flex-start' },
    navColumn: { width: '220px', flexShrink: 0 },
    mainColumn: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '1.5rem' },
    
    navYearTitle: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${colors.border}` },
    navMonthBtn: (isActive: boolean) => ({
      display: 'block', width: '100%', textAlign: 'left' as const, padding: '0.8rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', border: 'none', transition: '0.2s', marginBottom: '0.5rem',
      backgroundColor: isActive ? colors.primary : 'transparent',
      color: isActive ? '#ffffff' : colors.textMuted,
    }),

    // 💡 애청자가 빠지면서 디자인 밸런스를 맞춘 통계 레이아웃
    statsContainer: { backgroundColor: isDarkMode ? '#1e1a24' : '#f8fafc', padding: '1.5rem', borderRadius: '0.8rem', border: `1px solid ${colors.border}`, marginBottom: '1.5rem' },
    statsRowTop: { display: 'flex', justifyContent: 'center', gap: '5rem', marginBottom: '1.5rem' },
    statsRowBottom: { display: 'flex', justifyContent: 'center', gap: '5rem' },
    statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
    statLabel: { fontSize: '0.85rem', color: colors.statLabel, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' },
    statValue: { fontSize: '1.3rem', fontWeight: 'bold' },
    
    graphContainer: { padding: '1.5rem', backgroundColor: isDarkMode ? '#1e1a24' : '#f8fafc', borderRadius: '0.8rem', border: `1px solid ${colors.border}` },
    graphRow: { display: 'flex', height: '14px', marginBottom: '2px', alignItems: 'center' },
    graphYLabel: { width: '30px', fontSize: '0.7rem', color: colors.statLabel, textAlign: 'right' as const, paddingRight: '8px' },
    graphCell: (val: number) => ({
      flex: 1, margin: '0 1px', borderRadius: '2px', transition: '0.2s',
      backgroundColor: val > 0 ? colors.graphActive : colors.graphEmpty,
      opacity: val > 0 ? Math.min(0.5 + (val * 0.1), 1) : 1
    }),
    graphXAxis: { display: 'flex', paddingLeft: '30px', marginTop: '8px' },
    graphXLabel: { flex: 1, textAlign: 'center' as const, fontSize: '0.7rem', color: colors.statLabel },

    dateGroup: { marginBottom: '2.5rem' },
    dateHeader: { backgroundColor: colors.primary, color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '1rem' },
    timelineItem: { display: 'flex', gap: '1rem', padding: '0.8rem 0', borderBottom: `1px solid ${colors.border}` },
    timeText: { fontSize: '0.85rem', color: colors.textMuted, minWidth: '60px', paddingTop: '0.2rem', fontWeight: 'bold' },
    tagTitle: { backgroundColor: isDarkMode ? '#4c1d95' : '#f3e8ff', color: isDarkMode ? '#e9d5ff' : '#7e22ce', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.5rem' },
    tagCategory: { backgroundColor: isDarkMode ? '#064e3b' : '#dcfce7', color: isDarkMode ? '#a7f3d0' : '#15803d', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.5rem' },
    logMessage: { fontSize: '0.9rem', margin: 0, marginTop: '0.35rem', lineHeight: '1.4' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        
        <div style={styles.header}>
          <div style={styles.titleBox}>
            <img src="/logo-new.png" alt="몽나 로고" style={styles.logo} />
            <h1 style={styles.title}>몽나 월별 방송 현황판</h1>
          </div>
          <button style={styles.themeBtn} onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️ 라이트 모드' : '🌙 다크 모드'}
          </button>
        </div>

        <div style={styles.compactStatusLine}>
          {status?.isLive ? <span style={styles.badgeOn}>ON AIR 🔴</span> : <span style={styles.badgeOff}>OFFLINE</span>}
          <div style={styles.statusText}>
            {status?.isLive ? (
              <>
                <span><span style={{color: colors.statLabel}}>방제:</span> {status.title}</span>
                <span><span style={{color: colors.statLabel}}>카테고리:</span> {status.category}</span>
                <span style={{color: '#3b82f6'}}>👁️ {status.viewers?.toLocaleString()}명</span>
              </>
            ) : (
              <span style={{color: colors.statLabel}}>현재 진행 중인 방송이 없습니다.</span>
            )}
          </div>
        </div>

        <div style={styles.layoutRow}>
          
          <div style={styles.navColumn}>
            <div style={styles.card}>
              {Object.keys(groupedNav).sort().reverse().map(year => (
                <div key={year} style={{ marginBottom: '1.5rem' }}>
                  <div style={styles.navYearTitle}>{year}년</div>
                  {groupedNav[year].sort().reverse().map(month => {
                    const ym = `${year}-${month}`;
                    return (
                      <button key={ym} style={styles.navMonthBtn(selectedMonth === ym)} onClick={() => setSelectedMonth(ym)}>
                        {month}월 데이터
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={styles.mainColumn}>
            
            <div style={styles.card}>
              <h2 style={{...styles.cardTitle, marginBottom: '1.5rem'}}>📈 {selMon}월 방송 통계 & 분포도</h2>
              
              <div style={styles.statsContainer}>
                <div style={styles.statsRowTop}>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>📅 방송 일수</div>
                    <div style={styles.statValue}>🏆 {activeDays.size}일 <span style={{fontSize:'0.9rem', color: colors.statLabel, fontWeight:'normal'}}>/ {daysInMonth}일</span></div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>🕒 방송 시간</div>
                    <div style={styles.statValue}>{Math.floor(monthlyStats.totalMinutes / 60)}시간 {monthlyStats.totalMinutes % 60}분</div>
                  </div>
                </div>
                
                {/* 💡 애청자를 제거하고 최고/평균 시청자만 깔끔하게 배치했습니다. */}
                <div style={styles.statsRowBottom}>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>⬆️ 최고 시청자</div>
                    <div style={styles.statValue}>{monthlyStats.maxViewers.toLocaleString()}명</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statLabel}>📊 평균 시청자</div>
                    <div style={styles.statValue}>{monthlyStats.avgViewers.toLocaleString()}명</div>
                  </div>
                </div>
              </div>

              <div style={styles.graphContainer}>
                {heatmapData.map((row, hour) => (
                  <div key={hour} style={styles.graphRow}>
                    <div style={styles.graphYLabel}>
                      {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
                    </div>
                    {row.map((val, dayIndex) => (
                      <div key={dayIndex} style={styles.graphCell(val)} title={`${dayIndex + 1}일 ${hour}시: ${val}건`} />
                    ))}
                  </div>
                ))}
                <div style={styles.graphXAxis}>
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <div key={i} style={styles.graphXLabel}>
                      {(i + 1) % 5 === 0 || i === 0 || i === daysInMonth - 1 ? i + 1 : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={{...styles.cardTitle, marginBottom: '1.5rem'}}>📝 상세 타임라인 내역</h2>
              <div>
                {Object.keys(groupedTimeline).length > 0 ? (
                  Object.keys(groupedTimeline).sort().reverse().map(date => (
                    <div key={date} style={styles.dateGroup}>
                      <div style={styles.dateHeader}>
                        📅 {date.split('-')[1]}월 {date.split('-')[2]}일
                      </div>
                      <div>
                        {groupedTimeline[date].map((log: any) => (
                          <div key={log.id} style={styles.timelineItem}>
                            <span style={styles.timeText}>{log.timeStr}</span>
                            <div>
                              <span style={log.type === 'title' ? styles.tagTitle : styles.tagCategory}>
                                {log.type === 'title' ? '방제' : '카테고리'}
                              </span>
                              <p style={styles.logMessage}>{log.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: colors.textMuted, padding: '2rem 0' }}>해당 월에는 기록된 타임라인이 없습니다.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}