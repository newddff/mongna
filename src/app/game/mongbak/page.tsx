'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// 임시 색상표 (이미지가 없을 때 보여줄 예쁜 색상들)
const COLORS = [
  '#f8fafc', '#fecdd3', '#fbcfe8', '#f9a8d4', '#f472b6', 
  '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', 
  '#fbbf24', '#f59e0b', '#d97706'
];

export default function MongbakGame() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [nextLevel, setNextLevel] = useState(2);

  const playMergeSound = (level: number) => {
    // 임시 사운드 적용
    const audio = new Audio('/pop.mp3'); 
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

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

    // 벽을 투명하게 해서 더 깔끔하게 보이게 처리
    const ground = Matter.Bodies.rectangle(200, 600, 400, 50, { isStatic: true, render: { fillStyle: '#cbd5e1' } });
    const leftWall = Matter.Bodies.rectangle(0, 300, 50, 600, { isStatic: true, render: { fillStyle: 'transparent' } });
    const rightWall = Matter.Bodies.rectangle(400, 300, 50, 600, { isStatic: true, render: { fillStyle: 'transparent' } });
    
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((collision) => {
        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        if (bodyA.label === bodyB.label && bodyA.label.startsWith('mong_')) {
          const currentLvl = parseInt(bodyA.label.split('_')[1]);
          
          if (currentLvl < 11) {
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            
            const nextLvl = currentLvl + 1;
            setScore(prev => prev + (currentLvl * 10));
            playMergeSound(nextLvl); 

            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            const radius = 15 + nextLvl * 12;

            const newMong = Matter.Bodies.circle(newX, newY, radius, {
              label: `mong_${nextLvl}`,
              restitution: 0.3,
              render: {
                fillStyle: COLORS[nextLvl], // 이미지가 없으면 이 색상으로 표시!
                sprite: {
                  texture: `/mong_${nextLvl}.png`,
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

    setCurrentLevel(getRandomLowLevel());
    setNextLevel(getRandomLowLevel());

    return () => {
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
    };
  }, []);

  const handleDrop = (e: React.MouseEvent) => {
    if (!engineRef.current || !sceneRef.current) return;
    
    // 반응형 캔버스 클릭 위치 정확도 보정
    const canvas = sceneRef.current.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    
    let x = (e.clientX - rect.left) * scaleX;
    if (x < 30) x = 30;
    if (x > 370) x = 370;

    const radius = 15 + currentLevel * 12;
    const newMong = Matter.Bodies.circle(x, 50, radius, {
      label: `mong_${currentLevel}`, 
      restitution: 0.2,
      render: {
        fillStyle: COLORS[currentLevel], // 이미지가 없으면 색상 표시
        sprite: {
          texture: `/mong_${currentLevel}.png`,
          xScale: (radius * 2) / 100,
          yScale: (radius * 2) / 100
        }
      }
    });

    Matter.World.add(engineRef.current.world, newMong);

    setCurrentLevel(nextLevel);
    setNextLevel(getRandomLowLevel());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', width: '100%', padding: '0 10px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>🍉 몽박 게임 (수박게임)</h1>
      
      {/* 상태창 (점수 + 이미지 미리보기 UI) */}
      <div style={{ display: 'flex', gap: '30px', marginBottom: '15px', alignItems: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e11d48' }}>
          점수: {score}
        </div>
        
        <div style={{ display: 'flex', gap: '15px', backgroundColor: '#f1f5f9', padding: '10px 20px', borderRadius: '12px', alignItems: 'center' }}>
          
          {/* 지금 던질 공 미리보기 (그림) */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>지금 (Lv.{currentLevel})</div>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', backgroundColor: COLORS[currentLevel], margin: '0 auto', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              {/* 이미지 못 찾으면 alt 글자 숨기기 처리 */}
              <img src={`/mong_${currentLevel}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
          </div>
          
          <div style={{ width: '2px', height: '30px', backgroundColor: '#cbd5e1' }}></div>
          
          {/* 다음 공 미리보기 (그림) */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>다음 (Lv.{nextLevel})</div>
            <div style={{ 
              width: '30px', height: '30px', borderRadius: '50%', backgroundColor: COLORS[nextLevel], margin: '0 auto', overflow: 'hidden', opacity: 0.7
            }}>
              <img src={`/mong_${nextLevel}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
          </div>

        </div>
      </div>
      
      {/* 반응형 게임 화면 캔버스 영역 */}
      <div 
        ref={sceneRef} 
        onClick={handleDrop}
        style={{ 
          cursor: 'crosshair', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          width: '100%', 
          maxWidth: '400px', // 데스크톱에서는 너무 커지지 않게 방어
          aspectRatio: '2/3'  // 모바일에서도 비율 400x600 고정
        }}
        // CSS를 통해 캔버스가 부모 div 사이즈에 맞춰지도록 강제 조정
        className="responsive-canvas"
      ></div>

      {/* 반응형 캔버스를 위한 전역 스타일 */}
      <style dangerouslySetInnerHTML={{__html: `
        .responsive-canvas canvas {
          width: 100% !important;
          height: 100% !important;
        }
      `}} />
    </div>
  );
}
