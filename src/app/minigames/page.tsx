'use client';

import React, { useState } from 'react';

export default function MinigameHub() {
  // 현재 선택된 게임 상태 (null이면 로비, 'cannon'이면 대포 뽑기, 'ladder'이면 사다리 타기)
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '벌칙이나 리액션을 입력하고 시원하게 대포를 쏴서 랜덤으로 뽑아요.', ready: true },
    { id: 'ladder', icon: '🪜', title: '사다리타기', desc: '최대 6명 · 출발선을 클릭하면 사다리를 타고 내려가 결과를 확인해요!', ready: true },
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
        /* 공통 게임 보드 래퍼 */
        .board-wrapper {
          background: #ffffff;
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        /* 대포 게임 스타일 */
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
              activeGame === 'cannon' ? '💥 대포 뽑기' : '🪜 사다리타기'
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

        {/* 1. 로비 화면 (카드가 나열되는 기본 화면) */}
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

        {/* 2. 대포 뽑기 게임 실행 화면 */}
        {activeGame === 'cannon' && <CannonPlayground />}

        {/* 3. 사다리타기 게임 실행 화면 */}
        {activeGame === 'ladder' && <LadderPlayground />}
      </div>
    </div>
  );
}

/* =========================================================================
   💥 1. 대포 뽑기 컴포넌트
   ========================================================================= */
function CannonPlayground() {
  const [candidates, setCandidates] = useState('치킨 먹방\n피자 먹방\n애교 벌칙\n노래 1곡\n노방종 1시간\n꽝 (통과!)');
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

    // 대포 장전 & 발사 텀 (1.2초)
    setTimeout(() => {
      const picked = list[Math.floor(Math.random() * list.length)];
      setResult(picked);
      setIsFiring(false);
    }, 1200);
  };

  return (
    <div className="board-wrapper">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* 입력란 */}
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

        {/* 발사대 및 결과창 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="cannon-box">
            {isFiring ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', animation: 'spin 0.6s infinite linear' }}>💣</div>
                <div style={{ marginTop: '16px', fontSize: '20px', fontWeight: 800, color: '#805ad5' }}>
                  대포 장전 중... 조준 완료!!
                </div>
              </div>
            ) : result ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '50px', marginBottom: '8px' }}>🎉</div>
                <div style={{
                  fontSize: '28px',
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

/* =========================================================================
   🪜 2. 사다리타기 컴포넌트
   ========================================================================= */
function LadderPlayground() {
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState(['몽나', '시청자1', '시청자2', '시청자3']);
  const [goals, setGoals] = useState(['당첨 🎉', '꽝 💨', '벌칙 😈', '커피 쿠폰 ☕']);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [finalResult, setFinalResult] = useState<{ player: string; goal: string } | null>(null);

  // 사다리 가로줄 구조 생성 (4레벨 고정 사다리 예시 매핑)
  const ladderMapping = [2, 0, 3, 1]; // 0번선택->2번도착, 1번->0번도착, 2번->3번도착, 3번->1번도착

  const handleSelect = (idx: number) => {
    setSelectedPlayer(idx);
    const dest = ladderMapping[idx] % goals.length;
    setFinalResult({
      player: players[idx] || `참가자${idx + 1}`,
      goal: goals[dest] || '결과'
    });
  };

  return (
    <div className="board-wrapper">
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: '#718096', margin: 0 }}>
          출발하고 싶은 <strong>참가자 이름 버튼</strong>을 클릭하면 결과가 즉시 공개됩니다!
        </p>
      </div>

      {/* 사다리 영역 */}
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '24px',
        background: '#fdfbfe',
        borderRadius: '24px',
        border: '2px solid #ede9fe'
      }}>
        {/* 상단 참가자 버튼들 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          {players.slice(0, playerCount).map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              style={{
                background: selectedPlayer === idx ? '#7c3aed' : '#ffffff',
                color: selectedPlayer === idx ? '#ffffff' : '#4a5568',
                border: '2px solid #c4b5fd',
                borderRadius: '12px',
                padding: '10px 16px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 사다리 시각화 그래픽 (SVG) */}
        <div style={{ width: '100%', height: '220px', display: 'flex', justifyContent: 'center' }}>
          <svg width="100%" height="100%" viewBox="0 0 400 200" style={{ stroke: '#c4b5fd', strokeWidth: 4, strokeLinecap: 'round' }}>
            {/* 4개의 세로줄 */}
            <line x1="40" y1="10" x2="40" y2="190" />
            <line x1="140" y1="10" x2="140" y2="190" />
            <line x1="240" y1="10" x2="240" y2="190" />
            <line x1="340" y1="10" x2="340" y2="190" />

            {/* 가로 사다리 연결선들 */}
            <line x1="40" y1="50" x2="140" y2="50" stroke="#a78bfa" strokeWidth="3" />
            <line x1="140" y1="90" x2="240" y2="90" stroke="#a78bfa" strokeWidth="3" />
            <line x1="240" y1="130" x2="340" y2="130" stroke="#a78bfa" strokeWidth="3" />
            <line x1="40" y1="150" x2="140" y2="150" stroke="#a78bfa" strokeWidth="3" />
          </svg>
        </div>

        {/* 하단 당첨 결과 칸 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          {goals.slice(0, playerCount).map((g, idx) => (
            <div
              key={idx}
              style={{
                width: '80px',
                textAlign: 'center',
                padding: '8px 4px',
                background: '#ede9fe',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#5b21b6'
              }}
            >
              {g}
            </div>
          ))}
        </div>
      </div>

      {/* 결과 발표 배너 */}
      {finalResult && (
        <div style={{
          marginTop: '28px',
          textAlign: 'center',
          background: '#ede9fe',
          padding: '18px',
          borderRadius: '18px',
          border: '2px solid #ddd6fe'
        }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#5b21b6' }}>
            🎊 [{finalResult.player}]님의 사다리 결과는 👉 <strong>{finalResult.goal}</strong> 입니다!
          </span>
        </div>
      )}
    </div>
  );
}
