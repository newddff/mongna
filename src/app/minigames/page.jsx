'use client';

import { useState } from 'react';

export default function Minigames() {
  const [activeGame, setActiveGame] = useState('cannon');

  return (
    <div className="min-h-screen bg-[#2d2422] text-gray-200 p-8 font-sans">
      {/* 상단 헤더 */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-[#4a3f3c]">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            🎮 몽나 오락실
          </h1>
          <p className="text-sm text-gray-400 mt-1">방송 벌칙, 메뉴 선정은 여기서!</p>
        </div>
      </div>

      {/* 게임 선택 탭 */}
      <div className="max-w-4xl mx-auto flex space-x-4 mb-8 bg-[#3a2e2b] p-2 rounded-xl">
        <button
          onClick={() => setActiveGame('cannon')}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            activeGame === 'cannon' ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-[#453734] text-gray-400'
          }`}
        >
          💥 대포 뽑기
        </button>
        <button
          onClick={() => setActiveGame('ladder')}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            activeGame === 'ladder' ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-[#453734] text-gray-400'
          }`}
        >
          🪜 사다리 타기
        </button>
        <button
          onClick={() => setActiveGame('pinball')}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            activeGame === 'pinball' ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-[#453734] text-gray-400'
          }`}
        >
          🎱 핀볼 (준비중)
        </button>
      </div>

      {/* 게임 화면 영역 */}
      <div className="max-w-4xl mx-auto bg-[#1a1413] rounded-2xl border border-[#4a3f3c] p-8 shadow-2xl min-h-[500px]">
        {activeGame === 'cannon' && <CannonGame />}
        {activeGame === 'ladder' && <div className="text-center text-gray-500 mt-20">사다리 타기 로직 개발 중... 🛠️</div>}
        {activeGame === 'pinball' && <div className="text-center text-gray-500 mt-20">핀볼 엔진 개발 중... 🛠️</div>}
      </div>
    </div>
  );
}

// 💥 대포 뽑기 컴포넌트
function CannonGame() {
  const [items, setItems] = useState('치킨\n피자\n햄버거\n벌칙: 애교\n꽝');
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState(null);

  const handleFire = () => {
    const itemList = items.split('\n').filter(item => item.trim() !== '');
    if (itemList.length === 0) {
      alert('뽑을 항목을 입력해주세요!');
      return;
    }

    setIsFiring(true);
    setResult(null);

    // 대포 쏘는 애니메이션 시간 (1.5초 후 결과 발표)
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * itemList.length);
      setResult(itemList[randomIndex]);
      setIsFiring(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 text-orange-400">대포 룰렛 뽑기</h2>
      
      <div className="flex w-full gap-8">
        {/* 왼쪽: 항목 입력란 */}
        <div className="w-1/3">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            후보 입력 (줄바꿈으로 구분)
          </label>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            className="w-full h-48 bg-[#2d2422] border border-[#4a3f3c] rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            placeholder="항목을 입력하세요..."
          />
        </div>

        {/* 오른쪽: 대포 발사 및 결과 화면 */}
        <div className="w-2/3 flex flex-col items-center justify-center bg-[#2d2422] rounded-xl border border-[#4a3f3c] relative overflow-hidden">
          
          {/* 대포 & 결과 애니메이션 영역 */}
          <div className="h-48 flex items-center justify-center w-full relative">
            {isFiring ? (
              <div className="text-6xl animate-bounce">💣🔥</div>
            ) : result ? (
              <div className="animate-in zoom-in spin-in-12 duration-500 text-center">
                <div className="text-5xl mb-2">🎉</div>
                <div className="text-3xl font-black text-white bg-orange-600 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.5)]">
                  {result}
                </div>
              </div>
            ) : (
              <div className="text-6xl text-gray-600">🎯</div>
            )}
          </div>

          <button
            onClick={handleFire}
            disabled={isFiring}
            className={`w-3/4 mb-6 py-4 rounded-xl font-black text-xl transition-all ${
              isFiring 
                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 active:scale-95 shadow-[0_5px_0_rgb(153,27,27)]'
            }`}
          >
            {isFiring ? '발사 중...!!' : 'FIRE !! 발사 !!'}
          </button>
        </div>
      </div>
    </div>
  );
}
