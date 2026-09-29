'use client';

import { useState } from 'react';

export default function MinigameHub() {
  const games = [
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '벌칙이나 리액션을 입력하고 시원하게 대포를 쏴서 랜덤으로 뽑아요.' },
    { id: 'ladder', icon: '🪜', title: '사다리타기', desc: '최대 24명 · 대각선 사다리, 아래에서 위로 모두 동시에 출발!' },
    { id: 'pinball', icon: '🎱', title: '핀볼 (준비중)', desc: '통통 튀는 구슬 장애물 레이스로 당첨자를 가려보세요.' },
    { id: 'roulette', icon: '🎯', title: '룰렛 돌리기 (준비중)', desc: '오늘의 밥 메뉴 추천, 벌칙 등 원판을 돌려 결과를 확인해요.' },
    { id: 'apple', icon: '🍎', title: '수박게임 (준비중)', desc: '과일을 자유롭게 떨어뜨려 합치고 가장 큰 과일을 만들어요.' },
    { id: 'dice', icon: '🎲', title: '주사위 굴리기 (준비중)', desc: '주사위를 굴려 운명의 숫자를 확인해보세요.' },
  ];

  return (
    <div className="arcade-container">
      {/* 💡 Tailwind 없이도 완벽하게 동작하는 순수 CSS 스타일 정의 */}
      <style>{`
        .arcade-container {
          min-height: 100vh;
          background-color: #d4c4e9;
          color: #333333;
          padding: 40px 24px;
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
          gap: 16px;
          margin-bottom: 36px;
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
        .arcade-subtitle {
          font-size: 14px;
          color: #553c9a;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.65);
          padding: 7px 16px;
          border-radius: 9999px;
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
          transition: gap 0.2s ease;
        }
        .game-card:hover .game-link {
          gap: 8px;
        }
      `}</style>

      <div className="arcade-inner">
        {/* 상단 헤더 */}
        <div className="arcade-header">
          <h1 className="arcade-title">🎮 몽나 오락실</h1>
          <span className="arcade-subtitle">방송 벌칙, 메뉴 선정은 여기서!</span>
        </div>

        {/* 게임 카드 그리드 */}
        <div className="game-grid">
          {games.map((game) => (
            <div 
              key={game.id}
              className="game-card"
              onClick={() => alert(`'${game.title}' 개발 중입니다! 🛠️`)}
            >
              <div>
                <div className="game-icon-box">
                  {game.icon}
                </div>
                <h3 className="game-name">{game.title}</h3>
                <p className="game-desc">{game.desc}</p>
              </div>

              <div className="game-link">
                <span>바로가기</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
