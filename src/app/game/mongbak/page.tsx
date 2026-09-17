'use client';

import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export default function MongbakGame() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // 1. 물리 엔진 및 렌더러 생성
    const engine = Matter.Engine.create();
    engineRef.current = engine;
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 400,
        height: 600,
        wireframes: false, // true로 하면 뼈대만 보임 (테스트용)
        background: '#f8fafc'
      }
    });

    // 2. 바닥과 양옆 벽면 만들기 (고정된 물체: isStatic)
    const ground = Matter.Bodies.rectangle(200, 600, 400, 50, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    const leftWall = Matter.Bodies.rectangle(0, 300, 50, 600, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    const rightWall = Matter.Bodies.rectangle(400, 300, 50, 600, { isStatic: true, render: { fillStyle: '#94a3b8' } });
    
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // 3. 충돌 이벤트 (수박게임의 핵심: 같은 레벨이 부딪히면 합치기)
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((collision) => {
        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        // bodyA와 bodyB의 '몽나 레벨(mongLevel)'이 같고, 둘 다 바닥/벽이 아니라면?
        if (bodyA.label === bodyB.label && bodyA.label.startsWith('mong_')) {
          const currentLevel = parseInt(bodyA.label.split('_')[1]);
          
          if (currentLevel < 11) { // 만렙(수박)이 아니라면 합치기!
            // 1. 기존 두 개 지우기
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            
            // 2. 두 물체의 중간 위치 계산
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            
            // 3. 다음 레벨 물체 생성 (크기 증가)
            const nextLevel = currentLevel + 1;
            const newRadius = nextLevel * 15; // 레벨마다 커지게 설정
            const newMong = Matter.Bodies.circle(newX, newY, newRadius, {
              label: `mong_${nextLevel}`,
              restitution: 0.3, // 탄성(통통 튀는 정도)
              render: { fillStyle: '#a855f7' } // 나중엔 여기에 몽나 얼굴 이미지를 넣습니다!
            });
            
            Matter.World.add(engine.world, newMong);
          }
        }
      });
    });

    // 4. 엔진 실행
    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // 컴포넌트가 꺼질 때 정리
    return () => {
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
    };
  }, []);

  // 화면을 클릭하면 과일(몽나 얼굴) 떨어뜨리기
  const handleDrop = (e: React.MouseEvent) => {
    if (!engineRef.current || !sceneRef.current) return;
    
    // 클릭한 X 좌표 가져오기 (벽 밖으로 안 나가게 조절)
    const rect = sceneRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    if (x < 30) x = 30;
    if (x > 370) x = 370;

    // 1레벨(제일 작은) 몽나 소환!
    const newMong = Matter.Bodies.circle(x, 50, 15, {
      label: `mong_1`, 
      restitution: 0.2,
      render: { fillStyle: '#fbcfe8' }
    });

    Matter.World.add(engineRef.current.world, newMong);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1 style={{ color: '#1e293b' }}>🍉 몽박 게임 (수박게임)</h1>
      <p style={{ color: '#64748b' }}>마우스로 클릭해서 몽나를 떨어뜨려보세요!</p>
      
      {/* 게임 화면 (캔버스) */}
      <div 
        ref={sceneRef} 
        onClick={handleDrop}
        style={{ cursor: 'crosshair', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      ></div>
    </div>
  );
}
