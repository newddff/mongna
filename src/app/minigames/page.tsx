'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function MinigameHub() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const router = useRouter();

  const games = [
    { id: 'ladder', icon: '🪜', title: '달구 사다리타기', desc: '설정 화면 없이 바로 슥슥 적고 출발하는 완벽한 사다리!', ready: true, isLink: false },
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '참가자 번호 추첨이나 벌칙을 시원하게 대포로 쏴서 뽑아요.', ready: true, isLink: false },
    { id: 'roulette', icon: '🎯', title: '룰렛 돌리기', desc: '오늘의 밥 메뉴 추천, 벌칙 등 원판을 힘차게 돌려 결과를 확인해요.', ready: true, isLink: false },
    // 💡 알려주신 핀볼 배포 주소(https://mongna.vercel.app)를 새 창 링크로 완벽히 연결했습니다.
    { id: 'pinball', icon: '🪐', title: '핀볼 추첨', desc: '다양한 맵에서 구슬이 빙글빙글 도는 마블 룰렛!', ready: true, isLink: true, path: 'https://mongna.vercel.app' },
  ];

  const handleCardClick = (g: any) => {
    if (!g.ready) {
      alert('준비중입니다!');
      return;
    }
    if (g.isLink) {
      window.open(g.path, '_blank');
    } else {
      setActiveGame(g.id);
    }
  };

  return (
    <div className="arcade-container">
      <style>{`
        .arcade-container { min-height: 100vh; background-color: #f3f0f8; color: #2d3748; padding: 30px 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; }
        .arcade-inner { max-width: 1150px; margin: 0 auto; }
        .arcade-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 16px; border-bottom: 2px solid rgba(139, 92, 246, 0.2); }
        .arcade-title { font-size: 22px; font-weight: 800; color: #2d3748; background: #ffffff; padding: 10px 22px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04); margin: 0; }
        .back-btn { background: #ffffff; border: none; padding: 10px 18px; border-radius: 14px; font-size: 14px; font-weight: 700; color: #7c3aed; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); transition: all 0.2s; }
        .back-btn:hover { background: #f5f3ff; transform: translateY(-2px); }
        
        .game-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 22px; }
        .game-card { background-color: #ffffff; border-radius: 24px; padding: 26px; display: flex; flex-direction: column; justify-content: space-between; min-height: 210px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04); cursor: pointer; transition: all 0.25s ease; border: 2px solid transparent; }
        .game-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(139, 92, 246, 0.12); border-color: #c4b5fd; }
        .game-icon-box { width: 52px; height: 52px; background-color: #f5f3ff; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px; }
        .game-name { font-size: 19px; font-weight: 700; color: #1a202c; margin: 0 0 8px 0; }
        .game-desc { font-size: 14px; color: #718096; line-height: 1.5; margin: 0; word-break: keep-all; }
        .game-link { margin-top: 20px; font-size: 14px; font-weight: 700; color: #8b5cf6; display: flex; align-items: center; gap: 4px; }
        
        .board-wrapper { background: #ffffff; border-radius: 28px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        .pill-input { width: 80px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 13px; font-weight: 700; text-align: center; color: #4a5568; outline: none; transition: all 0.2s; background: #ffffff; }
        .pill-input:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.2); }

        .game-layout { display: flex; flex-direction: column; gap: 30px; align-items: center; }
        .mascot-area { width: 260px; flex-shrink: 0; animation: float 3s ease-in-out infinite; display: flex; justify-content: center; align-items: center;}
        .mascot-area img { width: 100%; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(139, 92, 246, 0.15)); }
        .content-area { flex: 1; width: 100%; min-width: 0; }
        
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px) rotate(-2deg); } 75% { transform: translateX(5px) rotate(2deg); } }
        
        @media (min-width: 950px) { .game-layout { flex-direction: row; align-items: center; } }
      `}</style>

      <div className="arcade-inner">
        <div className="arcade-header">
          <h1 className="arcade-title">
            {activeGame === 'cannon' ? '💥 대포 뽑기' : 
             activeGame === 'ladder' ? '🪜 달구 사다리타기' : 
             activeGame === 'roulette' ? '🎯 룰렛 돌리기' : '🎮 몽나 오락실'}
          </h1>
          {activeGame && (
            <button className="back-btn" onClick={() => setActiveGame(null)}>← 오락실 로비로</button>
          )}
        </div>

        {!activeGame && (
          <div className="game-grid">
            {games.map((g) => (
              <div key={g.id} className="game-card" onClick={() => handleCardClick(g)}>
                <div><div className="game-icon-box">{g.icon}</div><h3 className="game-name">{g.title}</h3><p className="game-desc">{g.desc}</p></div>
                <div className="game-link"><span>{g.ready ? '게임 시작하기' : '준비중'}</span><span>→</span></div>
              </div>
            ))}
          </div>
        )}

        {activeGame === 'cannon' && <CannonPlayground />}
        {activeGame === 'ladder' && <LadderPlayground />}
        {activeGame === 'roulette' && <RoulettePlayground />}
      </div>
    </div>
  );
}

/* =========================================================================
   🎯 룰렛 돌리기
   ========================================================================= */
function RoulettePlayground() {
  const [candidates, setCandidates] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const parseCandidates = (text: string) => {
    const rawList = text.split('\n').map(s => s.trim()).filter(Boolean);
    const parsedList: string[] = [];
    
    rawList.forEach(item => {
      const match = item.match(/^(.*?)\s*\*\s*(\d+)$/);
      if (match) {
        const name = match[1].trim();
        const count = Math.min(Math.max(parseInt(match[2], 10), 1), 100);
        for (let i = 0; i < count; i++) {
          parsedList.push(name);
        }
      } else {
        parsedList.push(item);
      }
    });
    return parsedList;
  };

  const list = parseCandidates(candidates);
  const sliceAngle = list.length > 0 ? 360 / list.length : 0;
  const colors = ['#fdf4ff', '#e0e7ff', '#dcfce7', '#fef9c3', '#ffedd5', '#ffe4e6', '#f3e8ff', '#ccfbf1'];

  let gradient = 'conic-gradient(';
  list.forEach((_, i) => {
    const start = i * sliceAngle;
    const end = (i + 1) * sliceAngle;
    const color = colors[i % colors.length];
    gradient += `${color} ${start}deg ${end}deg${i === list.length - 1 ? '' : ', '}`;
  });
  gradient += ')';

  const handleSpin = () => {
    if (list.length < 2) return alert('룰렛 칸이 2개 이상이 되도록 입력해주세요!');
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    const winIndex = Math.floor(Math.random() * list.length);
    const centerAngle = (winIndex * sliceAngle) + (sliceAngle / 2);
    
    const baseSpin = 360 * 5;
    const targetRotation = (360 - centerAngle); 
    
    const currentMod = rotation % 360;
    let delta = targetRotation - currentMod;
    if (delta < 0) delta += 360;
    
    const nextRotation = rotation + baseSpin + delta;
    setRotation(nextRotation);

    setTimeout(() => {
      setResult(list[winIndex]);
      setIsSpinning(false);
    }, 3500);
  };

  return (
    <div className="board-wrapper">
      <div className="game-layout">
        <div className="mascot-area">
          <img 
            src="/roulette-mascot.png" 
            alt="룰렛 몽나" 
            onError={(e) => { 
              e.currentTarget.style.display = 'none'; 
              e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 120px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1));">🎡</div>';
            }} 
          />
        </div>

        <div className="content-area" style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', maxWidth: '300px' }}>
            <label style={{ display: 'block', fontWeight: 800, marginBottom: '10px', color: '#4a5568' }}>
              룰렛 항목 입력 <span style={{ fontSize: '13px', color: '#8b5cf6' }}>(항목*숫자로 중복가능)</span>
            </label>
            <textarea 
              value={candidates} 
              onChange={(e) => setCandidates(e.target.value)} 
              disabled={isSpinning}
              placeholder="예시:&#13;&#10;몽나바보*2&#13;&#10;꽝*3"
              style={{ width: '100%', height: '240px', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '15px', resize: 'none', outline: 'none', fontWeight: 600 }} 
            />
            <button 
              onClick={handleSpin} 
              disabled={isSpinning || list.length < 2} 
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', padding: '14px', borderRadius: '16px', fontSize: '18px', fontWeight: 900, cursor: isSpinning ? 'not-allowed' : 'pointer', width: '100%', marginTop: '16px', boxShadow: '0 4px 12px rgba(139,92,246,0.3)', transition: 'transform 0.1s' }}
            >
              {isSpinning ? '돌아가는 중... 🌀' : '🎯 룰렛 돌리기!'}
            </button>
          </div>

          <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: '-10px', zIndex: 10, width: 0, height: 0, borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: '28px solid #ef4444', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}></div>
            
            <div style={{ 
              width: '100%', height: '100%', borderRadius: '50%', background: list.length > 0 ? gradient : '#e2e8f0', 
              boxShadow: '0 8px 24px rgba(0,0,0,0.1), inset 0 0 0 6px #ffffff, inset 0 0 0 10px #c4b5fd',
              transform: `rotate(${rotation}deg)`, 
              transition: 'transform 3.5s cubic-bezier(0.1, 0.7, 0.1, 1)',
              position: 'relative', overflow: 'hidden'
            }}>
              {list.map((item, i) => {
                const cssAngle = (i * sliceAngle) + (sliceAngle / 2) - 90;
                return (
                  <div key={i} style={{ 
                    position: 'absolute', top: '50%', left: '50%', 
                    transform: `translate(-50%, -50%) rotate(${cssAngle}deg) translateX(90px)`,
                    fontWeight: 800, fontSize: '15px', color: '#4a5568', whiteSpace: 'nowrap',
                    width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center'
                  }}>
                    {item}
                  </div>
                )
              })}
            </div>
            
            <div style={{ position: 'absolute', width: '24px', height: '24px', background: '#ffffff', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '4px solid #c4b5fd' }}></div>

            {result && (
              <div style={{ position: 'absolute', zIndex: 20, background: '#ffffff', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(139,92,246,0.3)', border: '3px solid #8b5cf6', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', textAlign: 'center' }}>
                <style>{`@keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 800, marginBottom: '4px' }}>당첨 🎉</div>
                <div style={{ fontSize: '22px', color: '#a21caf', fontWeight: 900 }}>{result}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================================================================
   💥 대포 뽑기
   ========================================================================= */
function CannonPlayground() {
  const [mode, setMode] = useState<'number' | 'text'>('number');
  const [maxNumber, setMaxNumber] = useState<number | ''>(50);
  const [candidates, setCandidates] = useState('');
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<string | number | null>(null);

  const handleShoot = () => {
    setIsFiring(true); setResult(null);
    setTimeout(() => {
      if (mode === 'number') {
        const max = typeof maxNumber === 'number' ? maxNumber : 50;
        setResult(Math.floor(Math.random() * max) + 1);
      } else {
        const list = candidates.split('\n').map(s => s.trim()).filter(Boolean);
        if (list.length === 0) { alert('후보를 1개 이상 입력하세요!'); setIsFiring(false); return; }
        setResult(list[Math.floor(Math.random() * list.length)]);
      }
      setIsFiring(false);
    }, 1500); 
  };

  return (
    <div className="board-wrapper">
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
        <button onClick={() => { setMode('number'); setResult(null); }} style={{ padding: '10px 24px', borderRadius: '20px', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: mode === 'number' ? '#8b5cf6' : '#f3f4f6', color: mode === 'number' ? '#ffffff' : '#6b7280', boxShadow: mode === 'number' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none' }}>🔢 번호 뽑기</button>
        <button onClick={() => { setMode('text'); setResult(null); }} style={{ padding: '10px 24px', borderRadius: '20px', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: mode === 'text' ? '#8b5cf6' : '#f3f4f6', color: mode === 'text' ? '#ffffff' : '#6b7280', boxShadow: mode === 'text' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none' }}>📝 목록 뽑기</button>
      </div>
      <div className="game-layout" style={{ alignItems: 'stretch' }}>
        <div className="mascot-area" style={{ flex: '1' }}>
          <img src="/cannon-mascot.png" alt="대포 쏘는 몽나" style={{ width: '100%', maxWidth: '420px', animation: isFiring ? 'shake 0.4s infinite' : 'float 3s ease-in-out infinite' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 100px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1));">💣</div>'; }} />
        </div>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f6fc', borderRadius: '24px', padding: '40px 24px', border: '2px dashed #c4b5fd', minHeight: '260px' }}>
            {isFiring ? <div style={{ textAlign: 'center' }}><div style={{ fontSize: '72px', animation: 'bounce 0.5s infinite' }}>💣🔥</div><div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6', marginTop: '16px' }}>대포 장전 중...!!</div></div> 
            : result ? <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', color: '#6b7280', fontWeight: 700, marginBottom: '12px' }}>당첨 결과</div><div style={{ fontSize: mode === 'number' ? '64px' : '32px', fontWeight: 900, color: '#ffffff', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'inline-block', padding: '16px 40px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(236,72,153,0.3)' }}>{result}{mode === 'number' && '번'}</div></div> 
            : <div style={{ width: '100%', textAlign: 'center' }}>
                {mode === 'number' && ( <div><h2 style={{ fontSize: '24px', fontWeight: 800, color: '#4a5568', marginBottom: '24px' }}>마지막 번호가 몇 번인가요?</h2><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><input type="number" value={maxNumber} onChange={(e) => setMaxNumber(e.target.value ? Number(e.target.value) : '')} min="1" style={{ width: '120px', fontSize: '28px', fontWeight: 800, textAlign: 'center', padding: '12px', borderRadius: '16px', border: '3px solid #c4b5fd', outline: 'none', color: '#5b21b6' }} /><span style={{ fontSize: '24px', fontWeight: 800, color: '#4a5568' }}>번</span></div></div> )}
                {mode === 'text' && ( <div style={{ width: '100%' }}><label style={{ display: 'block', fontWeight: 800, fontSize: '18px', marginBottom: '12px', color: '#4a5568' }}>후보 항목 입력 (줄바꿈 구분)</label><textarea value={candidates} onChange={(e) => setCandidates(e.target.value)} placeholder="예시:&#13;&#10;치킨 먹방&#13;&#10;벌칙 애교" style={{ width: '100%', height: '180px', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '15px', resize: 'none', outline: 'none' }} /></div> )}
              </div>}
          </div>
          <button onClick={handleShoot} disabled={isFiring || (mode === 'number' && (!maxNumber || maxNumber < 1))} style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', padding: '18px 40px', borderRadius: '20px', fontSize: '20px', fontWeight: 900, cursor: isFiring ? 'not-allowed' : 'pointer', width: '100%', boxShadow: '0 6px 16px rgba(139,92,246,0.3)', transition: 'transform 0.1s' }}>{isFiring ? '발사 중...!!' : result ? '🔄 다시 쏘기' : '💥 대포 쏘기'}</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   🪜 올인원 사다리타기
   ========================================================================= */
function LadderPlayground() {
  const [colCount, setColCount] = useState<number>(4);
  const [players, setPlayers] = useState<string[]>(['몽나', '시청자1', '시청자2', '시청자3']);
  const [rewards, setRewards] = useState<string[]>(['결과1', '결과2', '결과3', '결과4']);
  const [bridges, setBridges] = useState<{col: number, y: number}[]>([]);
  const [showBridges, setShowBridges] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState(false);
  const [dalguPos, setDalguPos] = useState<{ x: number; y: number } | null>(null);
  const [trailPath, setTrailPath] = useState<string>('');
  const [finalResult, setFinalResult] = useState<{ player: string; goal: string } | null>(null);

  const colWidth = 100; const svgWidth = colCount * colWidth; const colXs = Array.from({ length: colCount }, (_, i) => i * colWidth + (colWidth / 2)); const startY = 0; const endY = 320;

  useEffect(() => { setPlayers(prev => Array.from({ length: colCount }, (_, i) => prev[i] || `이름${i+1}`)); setRewards(prev => Array.from({ length: colCount }, (_, i) => prev[i] || `결과${i+1}`)); generateBridges(colCount); }, [colCount]);

  const generateBridges = (count: number) => { const ySlots = [40, 80, 120, 160, 200, 240, 280]; const newBridges: {col: number, y: number}[] = []; ySlots.forEach(y => { for (let c = 0; c < count - 1; c++) { if (Math.random() < 0.45) { newBridges.push({ col: c, y }); c++; } } }); setBridges(newBridges); };
  const handleShuffle = () => { if (!isMoving) generateBridges(colCount); };
  const handleReset = () => { if (isMoving) return; setPlayers(Array.from({ length: colCount }, (_, i) => `이름${i+1}`)); setRewards(Array.from({ length: colCount }, (_, i) => `결과${i+1}`)); generateBridges(colCount); setFinalResult(null); setTrailPath(''); };
  const handleStartRandom = () => { if (isMoving) return; startLadder(Math.floor(Math.random() * colCount)); };

  const startLadder = (startCol: number) => {
    if (isMoving) return; setIsMoving(true); setFinalResult(null);
    let currentCol = startCol; let currentY = startY; const points = [{ x: colXs[currentCol], y: currentY }]; const sorted = [...bridges].sort((a, b) => a.y - b.y);
    for (const b of sorted) { if (b.y > currentY) { if (b.col === currentCol) { points.push({ x: colXs[currentCol], y: b.y }); currentCol++; points.push({ x: colXs[currentCol], y: b.y }); currentY = b.y; } else if (b.col === currentCol - 1) { points.push({ x: colXs[currentCol], y: b.y }); currentCol--; points.push({ x: colXs[currentCol], y: b.y }); currentY = b.y; } } }
    points.push({ x: colXs[currentCol], y: endY });
    let totalDist = 0; const segmentLengths = []; for (let i = 0; i < points.length - 1; i++) { const dist = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y); segmentLengths.push(dist); totalDist += dist; }
    const duration = 2800; const startTime = performance.now();
    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1); const currentDist = progress * totalDist;
      let accumulated = 0; let currX = points[0].x; let currY = points[0].y; let activePathStr = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < segmentLengths.length; i++) { const segLen = segmentLengths[i]; if (accumulated + segLen >= currentDist || i === segmentLengths.length - 1) { const segProgress = segLen === 0 ? 0 : (currentDist - accumulated) / segLen; currX = points[i].x + (points[i+1].x - points[i].x) * segProgress; currY = points[i].y + (points[i+1].y - points[i].y) * segProgress; activePathStr += ` L ${currX} ${currY}`; break; } else { accumulated += segLen; activePathStr += ` L ${points[i+1].x} ${points[i+1].y}`; } }
      setDalguPos({ x: currX, y: currY }); setTrailPath(activePathStr);
      if (progress < 1) { requestAnimationFrame(animate); } else { setIsMoving(false); setFinalResult({ player: players[startCol], goal: rewards[currentCol] }); }
    }; requestAnimationFrame(animate);
  };

  return (
    <div className="board-wrapper">
      <div className="game-layout">
        <div className="mascot-area">
          <img src="/ladder-mascot.png" alt="사다리 몽나와 달구" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 100px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1));">🪜</div>'; }} />
        </div>
        <div className="content-area">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '30px', padding: '6px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <button disabled={isMoving || colCount <= 2} onClick={() => setColCount(p => p - 1)} style={{ background:'none', border:'none', color:'#8b5cf6', fontWeight:800, cursor:'pointer', padding:'4px 8px' }}>&lt;</button><span style={{ fontSize: '15px', fontWeight: 800, color: '#4a5568', margin: '0 16px' }}>참가자 {colCount}명</span><button disabled={isMoving || colCount >= 8} onClick={() => setColCount(p => p + 1)} style={{ background:'none', border:'none', color:'#8b5cf6', fontWeight:800, cursor:'pointer', padding:'4px 8px' }}>&gt;</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleStartRandom} disabled={isMoving} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '15px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.3)', transition: 'transform 0.1s' }}>▷ START</button>
              <button onClick={() => setShowBridges(prev => !prev)} disabled={isMoving} title="가로선 보이기/숨기기" style={{ background: '#fff', color: showBridges ? '#8b5cf6' : '#9ca3af', border: '1px solid #e2e8f0', borderRadius: '50%', width: '42px', height: '42px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>{showBridges ? '👀' : '🙈'}</button>
              <button onClick={handleShuffle} disabled={isMoving} title="사다리 섞기" style={{ background: '#fff', color: '#8b5cf6', border: '1px solid #e2e8f0', borderRadius: '50%', width: '42px', height: '42px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>🔀</button>
              <button onClick={handleReset} disabled={isMoving} title="초기화" style={{ background: '#fff', color: '#ef4444', border: '1px solid #e2e8f0', borderRadius: '50%', width: '42px', height: '42px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>↺</button>
            </div>
          </div>
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
            <div style={{ minWidth: `${svgWidth}px`, position: 'relative', margin: '0 auto', height: '480px' }}>
              <div style={{ display: 'flex', width: '100%', position: 'absolute', top: 0, zIndex: 20 }}>
                {colXs.map((_, idx) => (
                  <div key={idx} style={{ width: `${colWidth}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <button disabled={isMoving} onClick={() => startLadder(idx)} style={{ background: 'transparent', border: 'none', cursor: isMoving ? 'not-allowed' : 'pointer', transition: 'transform 0.2s', padding: 0 }}><img src="/mongna.png" alt={`참가자${idx+1}`} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML=`<div style="width:56px;height:56px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:24px;border:2px solid #d8b4fe;">👑</div>`; }} /></button>
                    <input type="text" value={players[idx]} onChange={(e) => { const n = [...players]; n[idx] = e.target.value; setPlayers(n); }} disabled={isMoving} className="pill-input" placeholder="이름" />
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', top: '110px', width: '100%', height: '320px', zIndex: 10 }}>
                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                  {colXs.map((x, i) => ( <line key={`v${i}`} x1={x} y1={startY} x2={x} y2={endY} stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" /> ))}
                  {showBridges && bridges.map((b, i) => ( <line key={`h${i}`} x1={colXs[b.col]} y1={b.y} x2={colXs[b.col+1]} y2={b.y} stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" /> ))}
                  {trailPath && ( <path d={trailPath} fill="none" stroke="#f472b6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(244,114,182,0.6))' }} /> )}
                </svg>
                {dalguPos && ( <div style={{ position: 'absolute', left: `${dalguPos.x}px`, top: `${dalguPos.y}px`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 30 }}><img src="/dalgu.png" alt="달구" style={{ width: '50px', height: '50px', filter: 'drop-shadow(0 4px 8px rgba(244,114,182,0.5))' }} onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML=`<div style="font-size:32px;">🐹</div>`; }} /></div> )}
              </div>
              <div style={{ display: 'flex', width: '100%', position: 'absolute', top: '440px', zIndex: 20 }}>
                {colXs.map((_, idx) => ( <div key={idx} style={{ width: `${colWidth}px`, display: 'flex', justifyContent: 'center' }}><input type="text" value={rewards[idx]} onChange={(e) => { const n = [...rewards]; n[idx] = e.target.value; setRewards(n); }} disabled={isMoving} className="pill-input" style={{ borderColor: '#e9d8fd', color: '#6b21a8' }} placeholder="결과" /></div> ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {finalResult && ( <div style={{ marginTop: '10px', textAlign: 'center', background: '#fdfa8c', padding: '20px', borderRadius: '20px', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}><style>{`@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style><span style={{ fontSize: '18px', fontWeight: 800, color: '#b45309' }}>[{finalResult.player}]님의 결과 👉 <strong style={{ fontSize: '24px', color: '#ea580c', textDecoration: 'underline' }}>{finalResult.goal}</strong></span></div> )}
    </div>
  );
}
