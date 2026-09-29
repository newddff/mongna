'use client';

import { useState } from 'react';

export default function MinigameHub() {
  const [activeGame, setActiveGame] = useState(null);

  // 무지개색을 빼고, 몽나님의 라벤더 테마에 맞춰 통일감 있는 보라색 포인트로 정돈했습니다.
  const games = [
    { id: 'cannon', icon: '💥', title: '대포 뽑기', desc: '벌칙이나 리액션을 입력하고 시원하게 대포를 쏴서 랜덤으로 뽑아요.' },
    { id: 'ladder', icon: '🪜', title: '사다리타기', desc: '최대 24명 · 대각선 사다리, 아래에서 위로 모두 동시에 출발!' },
    { id: 'pinball', icon: '🎱', title: '핀볼 (준비중)', desc: '통통 튀는 구슬 장애물 레이스로 당첨자를 가려보세요.' },
    { id: 'roulette', icon: '🎯', title: '룰렛 돌리기 (준비중)', desc: '오늘의 밥 메뉴 추천, 벌칙 등 원판을 돌려 결과를 확인해요.' },
    { id: 'apple', icon: '🍎', title: '수박게임 (준비중)', desc: '과일을 자유롭게 떨어뜨려 합치고 가장 큰 과일을 만들어요.' },
    { id: 'dice', icon: '🎲', title: '주사위 굴리기 (준비중)', desc: '주사위를 굴려 운명의 숫자를 확인해보세요.' },
  ];

  return (
    // 캘린더와 동일한 라벤더 배경색
    <div className="min-h-screen bg-[#d4c4e9] text-gray-800 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* 상단 헤더 */}
        <div className="flex items-center space-x-4 mb-10 pb-4 border-b border-white/40">
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl shadow-sm">
             🎮 몽나 오락실
           </h1>
           <span className="text-sm text-purple-800 font-medium bg-white/50 px-3 py-1 rounded-full">
             방송 벌칙, 메뉴 선정은 여기서!
           </span>
        </div>

        {/* 3열 카드 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div 
              key={game.id}
              onClick={() => alert(`'${game.title}' 개발 중입니다! 뚝딱뚝딱 🛠️`)}
              className="bg-white border border-transparent rounded-3xl p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group min-h-[220px] shadow-sm"
            >
              <div>
                {/* 아이콘 배경을 라벤더(보라색) 톤으로 통일 */}
                <div className="mb-5 w-14 h-14 flex items-center justify-center rounded-2xl text-2xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110 duration-300">
                  {game.icon}
                </div>
                {/* 게임 제목 */}
                <h3 className="text-xl font-bold text-gray-800 mb-2 tracking-tight">
                  {game.title}
                </h3>
                {/* 게임 설명 */}
                <p className="text-sm text-gray-500 leading-relaxed break-keep font-medium">
                  {game.desc}
                </p>
              </div>
              
              {/* 하단 바로가기 텍스트도 보라색으로 통일 */}
              <div className="mt-6 text-[14px] font-bold flex items-center text-purple-600">
                <span>바로가기</span> 
                <span className="ml-1 opacity-80 group-hover:translate-x-1.5 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
