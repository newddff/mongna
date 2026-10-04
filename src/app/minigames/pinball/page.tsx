'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Matter from 'matter-js';

export default function PinballPage() {
  const router = useRouter();
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  
  // 상태 관리
  const [participantsInput, setParticipantsInput] = useState('몽나*3\n달구*2\n시청자*1');
  const [mapType, setMapType] = useState('spinners');
  const [winCondition, setWinCondition] = useState<'first' | 'last'>('last');
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // 물리 엔진 콜백 참조용
  const winConditionRef = useRef(winCondition);
  const totalBallsRef = useRef(0);
  const finishedBallsRef = useRef(0);
  const lastFinishedNameRef = useRef<string | null>(null);

  const canvasWidth = 600;
  const canvasHeight = 850;

  useEffect(() => {
    winConditionRef.current = winCondition;
  }, [winCondition]);

  // 이름*숫자 파싱
  const parseParticipants = (text: string) => {
    const rawList = text.split('\n').map(s => s.trim()).filter(Boolean);
    const parsedList: string[] = [];
    rawList.forEach(item => {
      // 쉼표도 지원하도록 추가 처리
      item.split(',').forEach(subItem => {
        const cleanItem = subItem.trim();
        if (!cleanItem) return;
        const match = cleanItem.match(/^(.*?)\s*\*\s*(\d+)$/);
        if (match) {
          const name = match[1].trim();
          const count = Math.min(Math.max(parseInt(match[2], 10), 1), 100);
          for (let i = 0; i < count; i++) parsedList.push(name);
        } else {
          parsedList.push(cleanItem);
        }
      });
    });
    return parsedList;
  };

  // 물리 엔진 및 맵 초기화
  const initEngine = () => {
    if (!sceneRef.current) return;

    // 기존 엔진 초기화 방지
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      if (renderRef.current.canvas) renderRef.current.canvas.remove();
    }
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
    }
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
    }

    const { Engine, Render, Runner, Bodies, Composite, Events, Constraint, Body } = Matter;

    const engine = Engine.create();
    engine.world.gravity.y = 1.0;
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: false, 
        background: '#18181b', // 다크 그레이 배경
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1
      }
    });
    renderRef.current = render;

    // 외곽 벽
    const wallOpts = { isStatic: true, render: { fillStyle: '#27272a', strokeStyle: '#0ea5e9', lineWidth: 2 } };
    const walls = [
      Bodies.rectangle(canvasWidth / 2, -200, canvasWidth * 2, 100, wallOpts),
      Bodies.rectangle(-20, canvasHeight / 2, 40, canvasHeight * 2, wallOpts),
      Bodies.rectangle(canvasWidth + 20, canvasHeight / 2, 40, canvasHeight * 2, wallOpts),
      // 결승선 센서
      Bodies.rectangle(canvasWidth / 2, canvasHeight + 40, canvasWidth, 80, { isStatic: true, isSensor: true, label: 'finishLine', render: { fillStyle: '#10b981' } })
    ];

    const obstacles: Matter.Body[] = [];
    const spinners: { body: Matter.Body; speed: number }[] = [];

    const addSpinner = (x: number, y: number, w: number, h: number, speed: number) => {
      const spinner = Bodies.rectangle(x, y, w, h, { render: { fillStyle: '#f43f5e', strokeStyle: '#fda4af', lineWidth: 2 } });
      const constraint = Constraint.create({ pointA: { x, y }, bodyB: spinner, length: 0, render: { visible: false } });
      Composite.add(engine.world, [spinner, constraint]);
      spinners.push({ body: spinner, speed });
    };

    // 맵 생성 로직
    if (mapType === 'spinners') {
      // 1. 운명의 수레바퀴 맵 (회전 중심)
      const pinOpts = { isStatic: true, render: { fillStyle: '#0ea5e9' } };
      for (let i = 0; i < 5; i++) obstacles.push(Bodies.circle(80 + i * 110, 200, 8, pinOpts));
      for (let i = 0; i < 4; i++) obstacles.push(Bodies.circle(135 + i * 110, 280, 8, pinOpts));
      
      addSpinner(150, 450, 160, 16, 0.07);
      addSpinner(450, 450, 160, 16, -0.05);
      addSpinner(300, 600, 220, 16, 0.08);
      
      obstacles.push(Bodies.rectangle(120, 750, 300, 20, { isStatic: true, angle: Math.PI / 6, render: { fillStyle: '#3f3f46' } }));
      obstacles.push(Bodies.rectangle(480, 750, 300, 20, { isStatic: true, angle: -Math.PI / 6, render: { fillStyle: '#3f3f46' } }));
    } 
    else if (mapType === 'pegs') {
      // 2. 촘촘한 핀볼 맵
      const pinOpts = { isStatic: true, chamfer: { radius: 5 }, render: { fillStyle: '#06b6d4' } };
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const offset = r % 2 === 0 ? 0 : 50;
          if (50 + c * 100 + offset < canvasWidth) {
            obstacles.push(Bodies.rectangle(50 + c * 100 + offset, 150 + r * 90, 10, 30, pinOpts));
          }
        }
      }
      obstacles.push(Bodies.polygon(canvasWidth / 2, 700, 3, 60, { isStatic: true, render: { fillStyle: '#f59e0b' } }));
    }

    Events.on(engine, 'beforeUpdate', () => {
      spinners.forEach(s => Body.setAngularVelocity(s.body, s.speed));
    });

    Composite.add(engine.world, [...walls, ...obstacles]);

    // 결승선 충돌 이벤트
    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (
          (bodyA.label === 'finishLine' && bodyB.label === 'playerBall') ||
          (bodyB.label === 'finishLine' && bodyA.label === 'playerBall')
        ) {
          const ball = bodyA.label === 'playerBall' ? bodyA : bodyB;
          
          if (ball.plugin.isFinished) continue;
          ball.plugin.isFinished = true;

          finishedBallsRef.current += 1;
          const participantName = ball.plugin.name;
          lastFinishedNameRef.current = participantName;

          // 공이 바닥에 닿으면 삭제
          Matter.Composite.remove(engine.world, ball);

          const condition = winConditionRef.current;
          const total = totalBallsRef.current;

          if (condition === 'first' && finishedBallsRef.current === 1) {
            setWinner(participantName);
            setIsPlaying(false);
          } 
          else if (condition === 'last' && finishedBallsRef.current === total) {
            setWinner(lastFinishedNameRef.current);
            setIsPlaying(false);
          }
        }
      }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;
  };

  useEffect(() => {
    initEngine();
    return () => {
      if (renderRef.current) Matter.Render.stop(renderRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    };
  }, [mapType]); // 맵이 바뀔 때마다 엔진 재시작

  const startGame = () => {
    if (!engineRef.current || isPlaying) return;
    
    const participants = parseParticipants(participantsInput);
    if (participants.length < 2) return alert('2개 이상의 공을 입력해주세요!');

    setIsPlaying(true);
    setWinner(null);
    totalBallsRef.current = participants.length;
    finishedBallsRef.current = 0;
    lastFinishedNameRef.current = null;

    const engine = engineRef.current;

    // 기존 공 싹 지우기
    const existingBalls = engine.world.bodies.filter(b => b.label === 'playerBall');
    Matter.Composite.remove(engine.world, existingBalls);

    // 💡 몽나 & 달구 이미지 (public 폴더)
    const images = ['/dalgu-ball.png', '/mongna-ball.png'];

    participants.forEach((name, index) => {
      const startX = (canvasWidth / 2) - 100 + (Math.random() * 200);
      const startY = -50 - (Math.random() * 300); // 딜레이를 주며 떨어짐
      
      const ball = Matter.Bodies.circle(startX, startY, 20, {
        label: 'playerBall',
        restitution: 0.7, 
        friction: 0.005,
        density: 0.05,
        plugin: { name: name, isFinished: false }, 
        render: {
          sprite: {
            texture: images[index % images.length],
            xScale: 0.85,
            yScale: 0.85
          }
        }
      });
      
      Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 6, y: 0 });
      Matter.Composite.add(engine.world, ball);
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f1f5f9', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 💡 헤더 영역 */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🪐 우주 핀볼 마블 룰렛
        </h1>
        <button 
          onClick={() => router.push('/minigames')}
          style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#475569'}
          onMouseOut={(e) => e.currentTarget.style.background = '#334155'}
        >
          ← 로비로 돌아가기
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px', display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* 💡 1. 좌측 컨트롤 패널 (오픈소스 UI 스타일 재현) */}
        <div style={{ flex: 1, minWidth: '350px', background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
              이름들을 입력하세요 <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>(예: 몽나*2, 달구)</span>
            </label>
            <textarea 
              value={participantsInput} 
              onChange={(e) => setParticipantsInput(e.target.value)} 
              disabled={isPlaying}
              style={{ width: '100%', height: '150px', padding: '16px', borderRadius: '12px', border: '1px solid #475569', background: '#0f172a', color: '#f1f5f9', fontSize: '15px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>🗺️ 맵 선택</span>
              <select 
                value={mapType} 
                onChange={(e) => setMapType(e.target.value)}
                disabled={isPlaying}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #475569', outline: 'none', cursor: 'pointer' }}
              >
                <option value="spinners">운명의 수레바퀴 (회전)</option>
                <option value="pegs">촘촘한 핀볼 밸리 (지그재그)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '15px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>🏆 당첨 순위</span>
              <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '4px', border: '1px solid #475569' }}>
                <button 
                  onClick={() => setWinCondition('first')} disabled={isPlaying}
                  style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: isPlaying ? 'not-allowed' : 'pointer', background: winCondition === 'first' ? '#0ea5e9' : 'transparent', color: winCondition === 'first' ? 'white' : '#94a3b8', transition: '0.2s' }}
                >
                  첫번째
                </button>
                <button 
                  onClick={() => setWinCondition('last')} disabled={isPlaying}
                  style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: isPlaying ? 'not-allowed' : 'pointer', background: winCondition === 'last' ? '#8b5cf6' : 'transparent', color: winCondition === 'last' ? 'white' : '#94a3b8', transition: '0.2s' }}
                >
                  마지막
                </button>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={startGame} 
              disabled={isPlaying}
              style={{ flex: 1, padding: '16px', background: isPlaying ? '#475569' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '16px', cursor: isPlaying ? 'not-allowed' : 'pointer', boxShadow: isPlaying ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4)' }}
            >
              {isPlaying ? '▶ 떨어지는 중...' : '▶ 시작'}
            </button>
          </div>

        </div>

        {/* 💡 2. 중앙 게임 캔버스 영역 */}
        <div style={{ position: 'relative', width: `${canvasWidth}px`, height: `${canvasHeight}px`, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '2px solid #475569', background: '#18181b', flexShrink: 0 }}>
          <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />

          {/* 우승자 결과 화면 */}
          {winner && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.4s ease-out' }}>
              <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`}</style>
              <div style={{ fontSize: '20px', color: '#94a3b8', fontWeight: 800, marginBottom: '10px' }}>
                {winCondition === 'first' ? '가장 먼저 들어온 우승자 🎉' : '끝까지 살아남은 우승자 🎉'}
              </div>
              <div style={{ fontSize: '56px', fontWeight: 900, color: 'white', textShadow: '0 0 20px #38bdf8, 0 0 40px #8b5cf6', textAlign: 'center', wordBreak: 'keep-all', padding: '0 20px' }}>
                {winner}
              </div>
              <button 
                onClick={() => setWinner(null)} 
                style={{ marginTop: '40px', padding: '12px 30px', background: 'white', color: '#0f172a', border: 'none', borderRadius: '99px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
              >
                결과 닫기
              </button>
            </div>
          )}
        </div>

        {/* 💡 3. 우측 몽나 마스코트 구역 */}
        <div style={{ flex: 1, minWidth: '250px', maxWidth: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', border: '1px dashed #475569' }}>
          
          <h3 style={{ color: '#cbd5e1', marginBottom: '20px', fontSize: '16px', fontWeight: 800 }}>🎮 몽나 전용 스탠딩 구역</h3>
          
          {/* 👇 이 아래 이미지 주소를 몽나님의 전신사진이나 귀여운 일러스트로 교체하세요! 👇 */}
          <img 
            src="https://via.placeholder.com/300x500/1e293b/8b5cf6?text=Mongna+Image" 
            alt="몽나 마스코트" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))', borderRadius: '16px' }}
          />
          {/* 👆 ========================================================================= 👆 */}
          
          <div style={{ marginTop: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
            이 구역은 몽나님의 이미지를 넣기 위한 전용 공간입니다. <br/>코드를 수정하여 원하는 이미지를 넣으세요!
          </div>

        </div>

      </div>
    </div>
  );
}
