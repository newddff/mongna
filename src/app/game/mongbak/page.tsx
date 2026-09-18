'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// 임시 이미지/사운드 주소 (나중에 Firebase에서 불러올 주소들)
const IMAGES = Array.from({ length: 12 }, (_, i) => `/mong_${i}.png`);
const SOUNDS = Array.from({ length: 12 }, (_, i) => `/sound_${i}.mp3`);

export default function MongbakGame() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  
  // 💡 추가된 상태(State)들
  const [score, setScore] = useState(0); // 점수
  const [currentLevel, setCurrentLevel] = useState(1); // 현재 손에 들고 있는 공
  const [nextLevel, setNextLevel] = useState(2); // 다음에 나올 공

  // 효과음 재생 함수 (합쳐져서 '새로 나온 공'의 레벨에 맞는 소리 재생)
  const playMergeSound = (level: number) => {
    // 나중에 관리자가 지정한 사운드 URL이 들어가게 됩니다.
    const audio = new Audio(SOUNDS[level] || '/pop.mp3'); 
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  // 랜덤으로 1~3단계 공 뽑기 (5번 요청: 낮은 공만 나오게 설정)
  const getRandomLowLevel = () => Math.floor(Math.random() * 3) + 1;

  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create();
    engineRef.current = engine;
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: '#f8fafc'
      }
    });

    const ground = Matter.Bodies.rectangle(200, 600, 400, 50, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    const leftWall = Matter.Bodies.rectangle(0, 300, 50, 600, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    const rightWall = Matter.Bodies.rectangle(400, 300, 50, 600, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // 충돌 (합치기) 이벤트
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((collision) => {
        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        if (bodyA.label === bodyB.label && bodyA.label.startsWith('mong_')) {
          const currentLvl = parseInt(bodyA.label.split('_')[1]);
          
          if (currentLvl < 11) { // 11단계(수박)가 끝
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            
            const nextLvl = currentLvl + 1;
            
            // 💡 3번 & 2번 요청: 점수 추가 및 지정된 효과음 재생
            setScore(prev => prev + (currentLvl * 10)); // 레벨이 높을수록 높은 점수
            playMergeSound(nextLvl); 

            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            const radius = 15 + nextLvl * 12;

            const newMong = Matter.Bodies.circle(newX, newY, radius, {
              label: `mong_${nextLvl}`,
              restitution: 0.3,
              render: {
                sprite: {
                  texture: IMAGES[nextLvl],
                  xScale: (radius * 2) / 100,
                  yScale: (radius * 2) / 100
                }
              }
            });
            Matter.World.add(engine.world, newMong);
          }
        }
      });
    });

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // 첫 시작 시 현재 공, 다음 공 세팅
    setCurrentLevel(getRandomLowLevel());
    setNextLevel(getRandomLowLevel());

    return () => {
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
    };
  }, []);

  // 화면 클릭 시 공 떨어뜨리기
  const handleDrop = (e: React.MouseEvent) => {
    if (!engineRef.current || !sceneRef.current) return;
    
    const rect = sceneRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    if (x < 30) x = 30;
    if (x > 370) x = 370;

    const radius = 15 + currentLevel * 12;
    const newMong = Matter.Bodies.circle(x, 50, radius, {
      label: `mong_${currentLevel}`, 
      restitution: 0.2,
      render: {
        sprite: {
          texture: IMAGES[currentLevel],
          xScale: (radius * 2) / 100,
          yScale: (radius * 2) / 100
        }
      }
    });

    Matter.World.add(engineRef.current.world, newMong);

    // 💡 4번 요청: 들고 있던 공을 떨어뜨렸으니, '다음 공'을 '현재 공'으로 가져오고 새 '다음 공' 뽑기
    setCurrentLevel(nextLevel);
    setNextLevel(getRandomLowLevel());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>🍉 몽박 게임 (수박게임)</h1>
      
      {/* 💡 3번 & 4번 요청: 점수 및 미리보기 UI */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '15px', alignItems: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e11d48' }}>
          점수: {score}
        </div>
        
        <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f1f5f9', padding: '10px 20px', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>지금 던질 공</div>
            <div style={{ fontWeight: 'bold' }}>Lv.{currentLevel}</div>
          </div>
          <div style={{ width: '2px', backgroundColor: '#cbd5e1' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>다음 공 (Next)</div>
            <div style={{ fontWeight: 'bold', color: '#94a3b8' }}>Lv.{nextLevel}</div>
          </div>
        </div>
      </div>
      
      {/* 게임 화면 캔버스 */}
      <div 
        ref={sceneRef} 
        onClick={handleDrop}
        style={{ cursor: 'crosshair', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      ></div>
    </div>
  );
}
