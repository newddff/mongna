'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatSyncPage() {
  const router = useRouter();
  
  const [bjId, setBjId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  // 채팅 시뮬레이션용 상태
  const [chatLogs, setChatLogs] = useState<{ id: string; nickname: string; text: string }[]>([]);
  const [votes, setVotes] = useState<{ [key: string]: number }>({ '1': 0, '2': 0, '3': 0, '4': 0 });
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 가짜 시청자 채팅 생성기 (1~4 랜덤 투표)
  const startTestMode = () => {
    setIsConnected(true);
    setIsTestMode(true);
    setChatLogs([{ id: 'system', nickname: '시스템', text: '테스트 모드가 시작되었습니다. 가짜 시청자 투표가 올라옵니다.' }]);
    
    const fakeNicknames = ['달구1호', '몽나바라기', '지나가던시청자', '게임고수', '방구석전문가'];
    
    testIntervalRef.current = setInterval(() => {
      const randomNum = Math.floor(Math.random() * 4) + 1;
      const randomNick = fakeNicknames[Math.floor(Math.random() * fakeNicknames.length)];
      
      const newChat = { 
        id: Date.now().toString(), 
        nickname: randomNick, 
        text: randomNum.toString() 
      };

      // 채팅 로그 추가 (최대 10개 유지)
      setChatLogs(prev => [newChat, ...prev].slice(0, 10));
      
      // 투표수 증가
      setVotes(prev => ({
        ...prev,
        [randomNum.toString()]: prev[randomNum.toString()] + 1
      }));
    }, 400); // 0.4초마다 채팅 1개씩 올라옴
  };

  const stopConnection = () => {
    setIsConnected(false);
    setIsTestMode(false);
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
  };

  // 컴포넌트 종료 시 타이머 해제
  useEffect(() => {
    return () => { if (testIntervalRef.current) clearInterval(testIntervalRef.current); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 상단 네비게이션 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <button onClick={() => router.push('/minigames')} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, color: '#4a5568', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            ← 로비로 돌아가기
          </button>
          <h1 style={{ marginLeft: '24px', fontSize: '24px', fontWeight: 900, color: '#2d3748', margin: '0 0 0 24px' }}>
            💬 시청자 참여 게임 (1 vs N)
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          
          {/* 왼쪽: 통신 연결 패널 */}
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '400px' }}>
            <div style={{ background: '#ffffff', padding: '32px', borderRadius: '24px', border: '3px solid #1e293b', boxShadow: '4px 4px 0px #1e293b' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px', color: '#1e293b' }}>채팅 연결</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>비워두고 [가짜 채팅 시작]을 누르면 테스트할 수 있어요.</p>
              
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>SOOP 아이디</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={bjId} 
                  onChange={(e) => setBjId(e.target.value)}
                  disabled={isConnected}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '15px', fontWeight: 700, outline: 'none' }} 
                  placeholder="아이디 입력"
                />
                {!isConnected ? (
                  <button onClick={() => alert('실제 API 연결은 다음 스텝에 진행합니다!')} style={{ background: '#facc15', border: '2px solid #1e293b', borderRadius: '12px', padding: '0 20px', fontWeight: 800, color: '#1e293b', cursor: 'pointer', boxShadow: '2px 2px 0px #1e293b' }}>
                    연결
                  </button>
                ) : (
                  <button onClick={stopConnection} style={{ background: '#ef4444', border: '2px solid #1e293b', borderRadius: '12px', padding: '0 20px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
                    중지
                  </button>
                )}
              </div>

              {!isConnected && (
                <button onClick={startTestMode} style={{ width: '100%', marginTop: '20px', background: '#e2e8f0', border: '2px solid #1e293b', padding: '14px', borderRadius: '12px', fontWeight: 800, color: '#1e293b', cursor: 'pointer', boxShadow: '2px 2px 0px #1e293b' }}>
                  🧪 가짜 시청자로 테스트 시작
                </button>
              )}
            </div>

            {/* 실시간 채팅 로그 (아래로 올라옴) */}
            <div style={{ marginTop: '24px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '24px', padding: '20px', height: '300px', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#94a3b8', marginBottom: '16px' }}>실시간 채팅 집계 중...</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatLogs.map((chat) => (
                  <div key={chat.id} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: 800, color: '#8b5cf6' }}>{chat.nickname}</span>
                    <span style={{ color: '#334155', fontWeight: 600 }}>{chat.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 투표 집계 현황 */}
          <div style={{ flex: '2', minWidth: '400px' }}>
            <div style={{ background: '#ffffff', padding: '40px', borderRadius: '24px', border: '3px solid #1e293b', boxShadow: '4px 4px 0px #1e293b', height: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0' }}>실시간 다수결 집계기</h2>
                <p style={{ color: '#64748b', fontWeight: 600 }}>채팅창에 1~4 숫자를 치면 실시간으로 반영됩니다.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[1, 2, 3, 4].map((num) => {
                  const voteCount = votes[num.toString()];
                  const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
                  
                  return (
                    <div key={num}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 800 }}>
                        <span style={{ fontSize: '18px', color: '#1e293b' }}>{num}번 선택지</span>
                        <span style={{ fontSize: '18px', color: '#8b5cf6' }}>{voteCount}명 <span style={{ color: '#94a3b8', fontSize: '14px' }}>({percentage}%)</span></span>
                      </div>
                      <div style={{ width: '100%', height: '28px', background: '#f1f5f9', borderRadius: '14px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                        <div style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #a78bfa, #8b5cf6)', 
                          transition: 'width 0.3s ease-out' 
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
