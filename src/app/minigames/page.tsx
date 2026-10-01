'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function MinigameHub() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    { id: 'ladder', icon: '🪜', title: '달구 사다리타기', desc: '출발선을 선택하면 귀여운 달구가 사다리를 타고 쪼르르 내려가요!', ready: true },
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '벌칙이나 리액션을 입력하고 시원하게 대포를 쏴서 랜덤으로 뽑아요.', ready: true },
    { id: 'dice', icon: '🎲', title: '주사위 굴리기 (준비중)', desc: '주사위를 굴려 운명의 숫자를 확인해보세요.', ready: false },
    { id: 'roulette', icon: '🎯', title: '룰렛 돌리기 (준비중)', desc: '오늘의 밥 메뉴 추천, 벌칙 등 원판을 돌려 결과를 확인해요.', ready: false },
    { id: 'apple', icon: '🍎', title: '수박게임 (준비중)', desc: '과일을 자유롭게 떨어뜨려 합치고 가장 큰 과일을 만들어요.', ready: false },
    { id: 'pinball', icon: '🎱', title: '핀볼 (준비중)', desc: '통통 튀는 구슬 장애물 레이스로 당첨자를 가려보세요.', ready: false },
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
          display: inline-flex;
          align-items: center;
          gap: 8px;
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
        .back-btn:hover {
          background: #f7f3fd;
          transform: translateY(-2px);
        }
        .game-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 22px;
        }
        .game-card {
          background-color: #ffffff;
          border-radius: 24px;
          padding: 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 210px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          border: 2px solid transparent;
          box-sizing: border-box;
        }
        .game-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(107, 70, 193, 0.12);
          border-color: #c4b5fd;
        }
        .game-icon-box {
          width: 52px;
          height: 52px;
          background-color: #f3e8ff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 16px;
        }
        .game-name {
          font-size: 19px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 8px 0;
        }
        .game-desc {
          font-size: 14px;
          color: #718096;
          line-height: 1.5;
          margin: 0;
          word-break: keep-all;
        }
        .game-link {
          margin-top: 20px;
          font-size: 14px;
          font-weight: 700;
          color: #7c3aed;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .board-wrapper {
          background: #ffffff;
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        /* 대포 게임 */
        .cannon-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8f6fc;
          border-radius: 20px;
          padding: 40px 20px;
          border: 2px dashed #d6bcfa;
          margin-top: 20px;
          min-height: 220px;
        }
        .fire-button {
          background: linear-gradient(135deg, #805ad5, #d53f8c);
          color: #ffffff;
          border: none;
          padding: 16px 40px;
          border-radius: 18px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(128, 90, 213, 0.35);
          transition: all 0.2s;
        }
        .fire-button:hover:not(:disabled) {
          transform: scale(1.03);
          box-shadow: 0 8px 20px rgba(128, 90, 213, 0.45);
        }
        .fire-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="arcade-inner">
        {/* 상단 네비게이션 헤더 */}
        <div className="arcade-header">
          <h1 className="arcade-title">
            {activeGame ? (
              activeGame === 'cannon' ? '💥 대포 뽑기' : '🪜 달구 사다리타기'
            ) : (
              '🎮 몽나 오락실'
            )}
          </h1>
          {activeGame && (
            <button className="back-btn" onClick={() => setActiveGame(null)}>
              ← 오락실 로비로
            </button>
          )}
        </div>

        {/* 1. 로비 화면 */}
        {!activeGame && (
          <div className="game-grid">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => {
                  if (game.ready) {
                    setActiveGame(game.id);
                  } else {
                    alert(`'${game.title}'는 다음 패치에 준비 중입니다! 🛠️`);
                  }
                }}
              >
                <div>
                  <div className="game-icon-box">{game.icon}</div>
                  <h3 className="game-name">{game.title}</h3>
                  <p className="game-desc">{game.desc}</p>
                </div>
                <div className="game-link">
                  <span>{game.ready ? '게임 시작하기' : '준비중'}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. 대포 뽑기 게임 */}
        {activeGame === 'cannon' && <CannonPlayground />}

        {/* 3. 달구 사다리타기 게임 */}
        {activeGame === 'ladder' && <LadderPlayground />}
      </div>
    </div>
  );
}

/* =========================================================================
   🪜 1. 달구 사다리타기 (몽나 캐릭터 + 내려가는 달구 애니메이션 탑재)
   ========================================================================= */
function LadderPlayground() {
  const colXs = [60, 180, 300, 420];
  const startY = 30;
  const endY = 270;

  // 가로 연결선 (col: 0 -> 0과 1 연결, 1 -> 1과 2 연결, 2 -> 2와 3 연결)
  const [bridges] = useState([
    { col: 0, y: 70 },
    { col: 2, y: 90 },
    { col: 1, y: 125 },
    { col: 0, y: 165 },
    { col: 2, y: 195 },
    { col: 1, y: 230 },
  ]);

  const [goals, setGoals] = useState(['치킨 🍗', '꽝 💨', '애교 1회 💖', '노방종 1시간 ⏰']);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [dalguPos, setDalguPos] = useState<{ x: number; y: number } | null>(null);
  const [trailPath, setTrailPath] = useState<string>('');
  const [finalResult, setFinalResult] = useState<{ mongnaNum: number; goal: string } | null>(null);

  // 사다리 경로(경유지 점들) 계산 로직
  const calculatePath = (startCol: number) => {
    let currentCol = startCol;
    let currentY = startY;
    const points = [{ x: colXs[currentCol], y: currentY }];

    // y높이 순으로 가로 다리 정렬
    const sortedBridges = [...bridges].sort((a, b) => a.y - b.y);

    for (const b of sortedBridges) {
      if (b.y > currentY) {
        if (b.col === currentCol) {
          // 오른쪽으로 이동
          points.push({ x: colXs[currentCol], y: b.y });
          currentCol = currentCol + 1;
          points.push({ x: colXs[currentCol], y: b.y });
          currentY = b.y;
        } else if (b.col === currentCol - 1) {
          // 왼쪽으로 이동
          points.push({ x: colXs[currentCol], y: b.y });
          currentCol = currentCol - 1;
          points.push({ x: colXs[currentCol], y: b.y });
          currentY = b.y;
        }
      }
    }

    points.push({ x: colXs[currentCol], y: endY });
    return { points, endCol: currentCol };
  };

  // 몽나 출발 버튼 클릭 시 달구 이동 애니메이션 시작
  const startLadder = (colIndex: number) => {
    if (isMoving) return;

    setSelectedCol(colIndex);
    setIsMoving(true);
    setFinalResult(null);

    const { points, endCol } = calculatePath(colIndex);

    // 구간별 거리 계산
    const segmentLengths: number[] = [];
    let totalDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      segmentLengths.push(dist);
      totalDist += dist;
    }

    const duration = 2800; // 달구가 내려가는 시간 (2.8초)
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentDist = progress * totalDist;

      // 현재 진행 거리에 해당하는 좌표 구하기
      let accumulated = 0;
      let currX = points[0].x;
      let currY = points[0].y;
      let activePathStr = `M ${points[0].x} ${points[0].y}`;

      for (let i = 0; i < segmentLengths.length; i++) {
        const segLen = segmentLengths[i];
        if (accumulated + segLen >= currentDist || i === segmentLengths.length - 1) {
          const segProgress = segLen === 0 ? 0 : (currentDist - accumulated) / segLen;
          currX = points[i].x + (points[i + 1].x - points[i].x) * segProgress;
          currY = points[i].y + (points[i + 1].y - points[i].y) * segProgress;
          activePathStr += ` L ${currX} ${currY}`;
          break;
        } else {
          accumulated += segLen;
          activePathStr += ` L ${points[i + 1].x} ${points[i + 1].y}`;
        }
      }

      setDalguPos({ x: currX, y: currY });
      setTrailPath(activePathStr);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        setFinalResult({
          mongnaNum: colIndex + 1,
          goal: goals[endCol]
        });
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="board-wrapper">
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4a5568', margin: '0 0 6px 0' }}>
          출발할 몽나 캐릭터를 클릭하세요!
        </h2>
        <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
          선택한 몽나 자리에서 달구가 출발해 사다리를 타고 당첨 결과를 찾아갑니다 🐾
        </p>
      </div>

      <div style={{
        maxWidth: '540px',
        margin: '0 auto',
        padding: '26px 16px',
        background: '#fdfbfe',
        borderRadius: '26px',
        border: '2px solid #ede9fe',
        position: 'relative'
      }}>
        {/* 상단: 몽나 캐릭터 출발 버튼 4개 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '14px' }}>
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              disabled={isMoving}
              onClick={() => startLadder(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: selectedCol === idx ? '#ede9fe' : '#ffffff',
                border: selectedCol === idx ? '2px solid #805ad5' : '2px solid #e9d8fd',
                borderRadius: '18px',
                padding: '10px 14px',
                cursor: isMoving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                transform: selectedCol === idx ? 'scale(1.05)' : 'none',
                boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
              }}
            >
              {/* 몽나 캐릭터 이미지 (public/mongna.png 없으면 기본 보라 요정 그래픽 표시) */}
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#e9d8fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontSize: '22px'
              }}>
                <img
                  src="/mongna.png"
                  alt={`몽나 ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    // 이미지 없을 시 대체 텍스트/이모지
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerText = '👑';
                    }
                  }}
                />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#553c9a' }}>
                {idx + 1}번 몽나
              </span>
            </button>
          ))}
        </div>

        {/* 사다리 판 (SVG) */}
        <div style={{ position: 'relative', width: '100%', height: '300px' }}>
          <svg width="100%" height="100%" viewBox="0 0 480 300" style={{ overflow: 'visible' }}>
            {/* 기본 세로선 4줄 */}
            {colXs.map((x, i) => (
              <line key={i} x1={x} y1={startY} x2={x} y2={endY} stroke="#d8b4fe" strokeWidth="5" strokeLinecap="round" />
            ))}

            {/* 기본 가로 다리선들 */}
            {bridges.map((b, i) => (
              <line
                key={i}
                x1={colXs[b.col]}
                y1={b.y}
                x2={colXs[b.col + 1]}
                y2={b.y}
                stroke="#c084fc"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}

            {/* 달구가 지나간 길을 빛나게 표시하는 선 (Trail) */}
            {trailPath && (
              <path
                d={trailPath}
                fill="none"
                stroke="#ec4899"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.6))' }}
              />
            )}
          </svg>

          {/* 🐾 사다리를 타고 내려가는 '달구' 캐릭터 */}
          {dalguPos && (
            <div style={{
              position: 'absolute',
              left: `${(dalguPos.x / 480) * 100}%`,
              top: `${(dalguPos.y / 300) * 100}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              transition: 'transform 0.05s linear',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* 말풍선 */}
              <div style={{
                background: '#ec4899',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}>
                {isMoving ? '달구 달리는 중!' : '도착! 🎉'}
              </div>

              {/* 달구 캐릭터 (public/dalgu.png 없으면 귀여운 팬마스코트 그래픽 표시) */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '3px solid #ec4899',
                boxShadow: '0 4px 12px rgba(236,72,153,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontSize: '20px'
              }}>
                <img
                  src="/dalgu.png"
                  alt="달구"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerText = '🐹';
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 하단: 결과 칸 4개 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
          {goals.map((g, idx) => (
            <div
              key={idx}
              style={{
                width: '94px',
                textAlign: 'center',
                padding: '10px 4px',
                background: '#ede9fe',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#6b21a8',
                border: '2px solid #ddd6fe',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {g}
            </div>
          ))}
        </div>
      </div>

      {/* 최종 도착 결과 배너 */}
      {finalResult && (
        <div style={{
          marginTop: '26px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)',
          padding: '20px',
          borderRadius: '20px',
          border: '2px solid #f0abfc',
          boxShadow: '0 6px 16px rgba(217, 70, 239, 0.12)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>🎊</div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#86198f' }}>
            [{finalResult.mongnaNum}번 몽나]에서 출발한 달구의 당첨 결과는? 👉{' '}
            <strong style={{ fontSize: '22px', color: '#c026d3', textDecoration: 'underline' }}>
              {finalResult.goal}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   💥 2. 대포 뽑기 컴포넌트
   ========================================================================= */
function CannonPlayground() {
  const [candidates, setCandidates] = useState('치킨 먹방 🍗\n피자 먹방 🍕\n애교 벌칙 💖\n노래 1곡 🎤\n노방종 1시간 🔥\n꽝 (통과!) 💨');
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleShoot = () => {
    const list = candidates.split('\n').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) {
      alert('후보 항목을 1개 이상 입력해주세요!');
      return;
    }

    setIsFiring(true);
    setResult(null);

    setTimeout(() => {
      const picked = list[Math.floor(Math.random() * list.length)];
      setResult(picked);
      setIsFiring(false);
    }, 1200);
  };

  return (
    <div className="board-wrapper">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '10px', color: '#4a5568' }}>
            후보 항목 입력 (줄바꿈으로 구분)
          </label>
          <textarea
            value={candidates}
            onChange={(e) => setCandidates(e.target.value)}
            disabled={isFiring}
            style={{
              width: '100%',
              height: '240px',
              padding: '16px',
              borderRadius: '16px',
              border: '2px solid #e2e8f0',
              fontSize: '15px',
              lineHeight: '1.6',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="cannon-box">
            {isFiring ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px' }}>💣🔥</div>
                <div style={{ marginTop: '16px', fontSize: '20px', fontWeight: 800, color: '#805ad5' }}>
                  대포 조준 중... 발사 준비 완료!!
                </div>
              </div>
            ) : result ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '50px', marginBottom: '8px' }}>🎉</div>
                <div style={{
                  fontSize: '26px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#805ad5',
                  padding: '12px 28px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 15px rgba(128,90,213,0.4)',
                  display: 'inline-block'
                }}>
                  {result}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#a0aec0' }}>
                <div style={{ fontSize: '56px', marginBottom: '10px' }}>🎯</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>아래 발사 버튼을 누르면 대포가 날아갑니다!</div>
              </div>
            )}
          </div>

          <button className="fire-button" onClick={handleShoot} disabled={isFiring} style={{ width: '100%', marginTop: '20px' }}>
            {isFiring ? '대포 발사 중...!!' : '💥 대포 쏘기 (랜덤 뽑기)'}
          </button>
        </div>
      </div>
    </div>
  );
}
