'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function MinigameHub() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    { id: 'ladder', icon: '🪜', title: '달구 사다리타기', desc: '인원수 조절, 보상 커스텀, 무한 리트라이가 가능한 갓-겜!', ready: true },
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '벌칙이나 리액션을 입력하고 시원하게 대포를 쏴서 랜덤으로 뽑아요.', ready: true },
    { id: 'dice', icon: '🎲', title: '주사위 굴리기 (준비중)', desc: '주사위를 굴려 운명의 숫자를 확인해보세요.', ready: false },
    { id: 'roulette', icon: '🎯', title: '룰렛 돌리기 (준비중)', desc: '오늘의 밥 메뉴 추천, 벌칙 등 원판을 돌려 결과를 확인해요.', ready: false },
  ];

  return (
    <div className="arcade-container">
      <style>{`
        .arcade-container {
          min-height: 100vh;
          background-color: #d4c4e9;
          color: #2d3748;
          padding: 30px 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
        }
        .arcade-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .arcade-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 16px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.4);
        }
        .arcade-title {
          font-size: 22px;
          font-weight: 800;
          color: #2d3748;
          background: #ffffff;
          padding: 10px 22px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          margin: 0;
        }
        .back-btn {
          background: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          color: #553c9a;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all 0.2s;
        }
        .back-btn:hover { background: #f7f3fd; transform: translateY(-2px); }
        .game-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 22px; }
        .game-card {
          background-color: #ffffff; border-radius: 24px; padding: 26px;
          display: flex; flex-direction: column; justify-content: space-between;
          min-height: 210px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
          cursor: pointer; transition: all 0.25s ease; border: 2px solid transparent;
        }
        .game-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(107, 70, 193, 0.12); border-color: #c4b5fd; }
        .game-icon-box { width: 52px; height: 52px; background-color: #f3e8ff; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px; }
        .game-name { font-size: 19px; font-weight: 700; color: #1a202c; margin: 0 0 8px 0; }
        .game-desc { font-size: 14px; color: #718096; line-height: 1.5; margin: 0; word-break: keep-all; }
        .game-link { margin-top: 20px; font-size: 14px; font-weight: 700; color: #7c3aed; display: flex; align-items: center; gap: 4px; }
        
        .board-wrapper { background: #ffffff; border-radius: 28px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
        .btn-primary { background: linear-gradient(135deg, #805ad5, #d53f8c); color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(128,90,213,0.3); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(128,90,213,0.4); }
        .btn-secondary { background: #edf2f7; color: #4a5568; border: none; padding: 12px 24px; border-radius: 14px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: #e2e8f0; }
        
        input.reward-input { width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; text-align: center; outline: none; transition: border-color 0.2s; font-weight: 700; color: #4a5568; }
        input.reward-input:focus { border-color: #805ad5; }
      `}</style>

      <div className="arcade-inner">
        <div className="arcade-header">
          <h1 className="arcade-title">
            {activeGame === 'cannon' ? '💥 대포 뽑기' : activeGame === 'ladder' ? '🪜 달구 사다리타기' : '🎮 몽나 오락실'}
          </h1>
          {activeGame && (
            <button className="back-btn" onClick={() => setActiveGame(null)}>← 오락실 로비로</button>
          )}
        </div>

        {!activeGame && (
          <div className="game-grid">
            {games.map((g) => (
              <div key={g.id} className="game-card" onClick={() => g.ready ? setActiveGame(g.id) : alert('준비중입니다!')}>
                <div><div className="game-icon-box">{g.icon}</div><h3 className="game-name">{g.title}</h3><p className="game-desc">{g.desc}</p></div>
                <div className="game-link"><span>{g.ready ? '게임 시작하기' : '준비중'}</span><span>→</span></div>
              </div>
            ))}
          </div>
        )}

        {activeGame === 'cannon' && <CannonPlayground />}
        {activeGame === 'ladder' && <LadderPlayground />}
      </div>
    </div>
  );
}

/* =========================================================================
   🪜 동적 사다리타기 (자유 설정 + 무한 리트라이 + 에셋 적용)
   ========================================================================= */
function LadderPlayground() {
  const [mode, setMode] = useState<'setup' | 'play'>('setup');
  const [colCount, setColCount] = useState<number>(4);
  const [rewards, setRewards] = useState<string[]>(['치킨 🍗', '꽝 💨', '벌칙 😈', '커피 ☕']);
  
  // 사다리 선 데이터
  const [bridges, setBridges] = useState<{col: number, y: number}[]>([]);
  
  // 애니메이션 상태
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [dalguPos, setDalguPos] = useState<{ x: number; y: number } | null>(null);
  const [trailPath, setTrailPath] = useState<string>('');
  const [finalResult, setFinalResult] = useState<{ mongnaNum: number; goal: string } | null>(null);

  // SVG 좌표계
  const svgWidth = colCount * 100;
  const colXs = Array.from({ length: colCount }, (_, i) => i * 100 + 50);
  const startY = 30;
  const endY = 320;

  // 인원수 변경 시 보상 배열 맞추기
  useEffect(() => {
    setRewards(prev => {
      const newArr = [...prev];
      while (newArr.length < colCount) newArr.push('');
      return newArr.slice(0, colCount);
    });
  }, [colCount]);

  // 무작위 사다리 선 생성 함수
  const generateBridges = () => {
    const ySlots = [70, 110, 150, 190, 230, 270]; // 사다리가 그어질 수 있는 Y축 높이들
    const newBridges: {col: number, y: number}[] = [];
    
    ySlots.forEach(y => {
      for (let c = 0; c < colCount - 1; c++) {
        // 40% 확률로 가로선을 긋되, 연속된 가로선(사다리 충돌) 방지를 위해 c++
        if (Math.random() < 0.4) {
          newBridges.push({ col: c, y });
          c++; 
        }
      }
    });
    setBridges(newBridges);
  };

  // 게임 시작 버튼
  const handleStartGame = () => {
    generateBridges();
    setMode('play');
    setSelectedCol(null);
    setFinalResult(null);
    setTrailPath('');
    setDalguPos(null);
  };

  // 같은 보상으로 사다리 선만 다시 섞기 (리트라이)
  const handleRedraw = () => {
    if (isMoving) return;
    generateBridges();
    setSelectedCol(null);
    setFinalResult(null);
    setTrailPath('');
    setDalguPos(null);
  };

  // 사다리 경로 계산 및 애니메이션
  const startLadder = (startCol: number) => {
    if (isMoving) return;
    setSelectedCol(startCol);
    setIsMoving(true);
    setFinalResult(null);

    let currentCol = startCol;
    let currentY = startY;
    const points = [{ x: colXs[currentCol], y: currentY }];
    
    // y좌표 기준으로 정렬 후 탐색
    const sorted = [...bridges].sort((a, b) => a.y - b.y);

    for (const b of sorted) {
      if (b.y > currentY) {
        if (b.col === currentCol) {
          points.push({ x: colXs[currentCol], y: b.y });
          currentCol++;
          points.push({ x: colXs[currentCol], y: b.y });
          currentY = b.y;
        } else if (b.col === currentCol - 1) {
          points.push({ x: colXs[currentCol], y: b.y });
          currentCol--;
          points.push({ x: colXs[currentCol], y: b.y });
          currentY = b.y;
        }
      }
    }
    points.push({ x: colXs[currentCol], y: endY });

    // 애니메이션 실행
    let totalDist = 0;
    const segmentLengths = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dist = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
      segmentLengths.push(dist);
      totalDist += dist;
    }

    const duration = 2500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const currentDist = progress * totalDist;
      
      let accumulated = 0;
      let currX = points[0].x;
      let currY = points[0].y;
      let activePathStr = `M ${points[0].x} ${points[0].y}`;

      for (let i = 0; i < segmentLengths.length; i++) {
        const segLen = segmentLengths[i];
        if (accumulated + segLen >= currentDist || i === segmentLengths.length - 1) {
          const segProgress = segLen === 0 ? 0 : (currentDist - accumulated) / segLen;
          currX = points[i].x + (points[i+1].x - points[i].x) * segProgress;
          currY = points[i].y + (points[i+1].y - points[i].y) * segProgress;
          activePathStr += ` L ${currX} ${currY}`;
          break;
        } else {
          accumulated += segLen;
          activePathStr += ` L ${points[i+1].x} ${points[i+1].y}`;
        }
      }

      setDalguPos({ x: currX, y: currY });
      setTrailPath(activePathStr);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        setFinalResult({ mongnaNum: startCol + 1, goal: rewards[currentCol] || '결과 없음' });
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="board-wrapper">
      {/* ⚙️ 세팅 모드 화면 */}
      {mode === 'setup' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', color: '#4a5568' }}>⚙️ 사다리 게임 설정</h2>
          
          <div style={{ background: '#f7fafc', padding: '24px', borderRadius: '20px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#718096' }}>참가자 수 (사다리 개수)</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <button className="btn-secondary" onClick={() => setColCount(p => Math.max(2, p - 1))}>-</button>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#805ad5', width: '40px' }}>{colCount}</span>
              <button className="btn-secondary" onClick={() => setColCount(p => Math.min(8, p + 1))}>+</button>
            </div>
          </div>

          <div style={{ background: '#f7fafc', padding: '24px', borderRadius: '20px', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#718096' }}>하단 보상/벌칙 입력</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {rewards.map((r, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`${i + 1}번 보상`}
                  value={r}
                  onChange={(e) => {
                    const newRewards = [...rewards];
                    newRewards[i] = e.target.value;
                    setRewards(newRewards);
                  }}
                  className="reward-input"
                />
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={handleStartGame} style={{ width: '100%', fontSize: '18px', padding: '16px' }}>
            🚀 설정 완료! 사다리 타기 시작
          </button>
        </div>
      )}

      {/* 🎮 게임 플레이 화면 */}
      {mode === 'play' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4a5568', margin: '0 0 4px 0' }}>출발할 몽나를 클릭하세요!</h2>
              <p style={{ fontSize: '13px', color: '#a0aec0', margin: 0 }}>마음에 안들면 우측 버튼으로 새 판을 깔 수 있습니다.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={handleRedraw} disabled={isMoving}>
                🔄 사다리 선 다시 섞기
              </button>
              <button className="btn-secondary" onClick={() => setMode('setup')} disabled={isMoving}>
                ⚙️ 보상 재설정
              </button>
            </div>
          </div>

          <div style={{
            width: '100%', overflowX: 'auto', background: '#fdfbfe', 
            borderRadius: '26px', border: '2px solid #ede9fe', padding: '24px'
          }}>
            <div style={{ minWidth: `${svgWidth}px`, position: 'relative', margin: '0 auto' }}>
              
              {/* 상단 몽나 토큰 출발 버튼들 */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px' }}>
                {colXs.map((_, idx) => (
                  <div key={idx} style={{ width: '100px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      disabled={isMoving}
                      onClick={() => startLadder(idx)}
                      style={{
                        background: 'transparent', border: 'none', cursor: isMoving ? 'not-allowed' : 'pointer',
                        transform: selectedCol === idx ? 'scale(1.15) translateY(-5px)' : 'scale(1)',
                        transition: 'all 0.2s', filter: selectedCol === idx ? 'drop-shadow(0 4px 10px rgba(128,90,213,0.4))' : 'none'
                      }}
                    >
                      <img src="/mongna.png" alt={`출발 ${idx+1}`} style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerText='👑'; }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* SVG 사다리 선 */}
              <div style={{ position: 'relative', height: '350px' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} 350`} style={{ overflow: 'visible' }}>
                  {/* 세로선 */}
                  {colXs.map((x, i) => (
                    <line key={`v${i}`} x1={x} y1={startY} x2={x} y2={endY} stroke="#e9d8fd" strokeWidth="6" strokeLinecap="round" />
                  ))}
                  {/* 가로선 (다리) */}
                  {bridges.map((b, i) => (
                    <line key={`h${i}`} x1={colXs[b.col]} y1={b.y} x2={colXs[b.col+1]} y2={b.y} stroke="#d6bcfa" strokeWidth="6" strokeLinecap="round" />
                  ))}
                  {/* 달구 이동 궤적 */}
                  {trailPath && (
                    <path d={trailPath} fill="none" stroke="#ec4899" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.6))' }} />
                  )}
                </svg>

                {/* 내려가는 달구 토큰 */}
                {dalguPos && (
                  <div style={{
                    position: 'absolute', left: `${(dalguPos.x / svgWidth) * 100}%`, top: `${(dalguPos.y / 350) * 100}%`,
                    transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10
                  }}>
                    <img src="/dalgu.png" alt="달구" style={{ width: '56px', height: '56px', filter: 'drop-shadow(0 6px 12px rgba(236,72,153,0.5))' }}
                      onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerText='🐹'; }}
                    />
                  </div>
                )}
              </div>

              {/* 하단 보상 칸 */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
                {rewards.map((r, idx) => (
                  <div key={idx} style={{
                    width: '90px', textAlign: 'center', padding: '12px 6px', background: '#f3e8ff',
                    borderRadius: '12px', fontSize: '14px', fontWeight: 800, color: '#5b21b6', wordBreak: 'keep-all'
                  }}>
                    {r || `보상 ${idx+1}`}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* 최종 당첨 결과 팝업 */}
          {finalResult && (
            <div style={{
              marginTop: '20px', textAlign: 'center', background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)',
              padding: '24px', borderRadius: '20px', border: '2px solid #f0abfc', boxShadow: '0 6px 16px rgba(217, 70, 239, 0.12)',
              animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <style>{`@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉🎊</div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#86198f' }}>
                [{finalResult.mongnaNum}번 몽나]의 당첨 결과는? 👉{' '}
                <strong style={{ fontSize: '24px', color: '#c026d3', textDecoration: 'underline' }}>{finalResult.goal}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   💥 대포 뽑기 (이전과 동일)
   ========================================================================= */
function CannonPlayground() {
  const [candidates, setCandidates] = useState('치킨 먹방 🍗\n피자 먹방 🍕\n애교 벌칙 💖\n노래 1곡 🎤\n노방종 1시간 🔥\n꽝 (통과!) 💨');
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleShoot = () => {
    const list = candidates.split('\n').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return alert('후보를 1개 이상 입력하세요!');
    setIsFiring(true); setResult(null);
    setTimeout(() => { setResult(list[Math.floor(Math.random() * list.length)]); setIsFiring(false); }, 1200);
  };

  return (
    <div className="board-wrapper">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '10px', color: '#4a5568' }}>후보 항목 입력 (줄바꿈 구분)</label>
          <textarea value={candidates} onChange={(e) => setCandidates(e.target.value)} disabled={isFiring}
            style={{ width: '100%', height: '240px', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '15px', resize: 'none', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f6fc', borderRadius: '20px', padding: '40px 20px', border: '2px dashed #d6bcfa', minHeight: '220px' }}>
            {isFiring ? <div style={{ fontSize: '64px', textAlign: 'center' }}>💣🔥<div style={{ fontSize: '18px', fontWeight: 800, color: '#805ad5', marginTop: '10px' }}>장전 중...</div></div> 
            : result ? <div style={{ textAlign: 'center' }}><div style={{ fontSize: '50px' }}>🎉</div><div style={{ fontSize: '24px', fontWeight: 900, color: '#fff', background: '#805ad5', padding: '10px 24px', borderRadius: '99px', marginTop: '10px' }}>{result}</div></div> 
            : <div style={{ textAlign: 'center', color: '#a0aec0' }}><div style={{ fontSize: '56px' }}>🎯</div><div style={{ fontWeight: 600, marginTop: '10px' }}>버튼을 눌러 발사!</div></div>}
          </div>
          <button className="btn-primary" onClick={handleShoot} disabled={isFiring} style={{ width: '100%', marginTop: '20px' }}>
            {isFiring ? '발사 중...!!' : '💥 대포 쏘기 (랜덤 뽑기)'}
          </button>
        </div>
      </div>
    </div>
  );
}
