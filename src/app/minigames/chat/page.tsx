'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ROWS = 6;
const COLS = 7;
type Player = 'streamer' | 'viewers' | null;

export default function ChatSyncPage() {
  const router = useRouter();
  
  const [bjId, setBjId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [chatLogs, setChatLogs] = useState<{ id: string; nickname: string; text: string }[]>([]);
  
  const [board, setBoard] = useState<Player[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [turn, setTurn] = useState<'streamer' | 'viewers'>('streamer');
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  
  const [votes, setVotes] = useState<{ [key: number]: number }>({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
  const [timeLeft, setTimeLeft] = useState(10); 

  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 💥 버그 수정: 최신 투표수와 보드판을 타이머와 분리하기 위해 Ref 사용
  const votesRef = useRef(votes);
  const boardRef = useRef(board);
  useEffect(() => { votesRef.current = votes; }, [votes]);
  useEffect(() => { boardRef.current = board; }, [board]);

  const checkWin = (newBoard: Player[][], player: Player) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newBoard[r][c] || newBoard[r][c] !== player) continue;
        if (c + 3 < COLS && newBoard[r][c+1] === player && newBoard[r][c+2] === player && newBoard[r][c+3] === player) return true;
        if (r + 3 < ROWS && newBoard[r+1][c] === player && newBoard[r+2][c] === player && newBoard[r+3][c] === player) return true;
        if (r + 3 < ROWS && c + 3 < COLS && newBoard[r+1][c+1] === player && newBoard[r+2][c+2] === player && newBoard[r+3][c+3] === player) return true;
        if (r + 3 < ROWS && c - 3 >= 0 && newBoard[r+1][c-1] === player && newBoard[r+2][c-2] === player && newBoard[r+3][c-3] === player) return true;
      }
    }
    return false;
  };

  const dropPiece = (colIndex: number, player: 'streamer' | 'viewers') => {
    if (winner) return;
    const newBoard = boardRef.current.map(row => [...row]);
    
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newBoard[r][colIndex]) {
        newBoard[r][colIndex] = player;
        setBoard(newBoard);
        
        if (checkWin(newBoard, player)) {
          setWinner(player);
        } else if (newBoard.flat().every(cell => cell !== null)) {
          setWinner('draw');
        } else {
          const nextTurn = player === 'streamer' ? 'viewers' : 'streamer';
          setTurn(nextTurn);
          if (nextTurn === 'viewers') {
            setVotes({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
            setTimeLeft(10);
          }
        }
        return;
      }
    }
    if (player === 'viewers') {
      alert('해당 열이 꽉 찼습니다! 다시 투표합니다.');
      setVotes({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
      setTimeLeft(10);
    }
  };

  const handleStreamerClick = (colIndex: number) => {
    if (turn !== 'streamer' || winner || board[0][colIndex]) return;
    dropPiece(colIndex, 'streamer');
  };

  // 💥 버그 수정: 채팅 업데이트와 무관하게 1초마다 정확히 깎이는 순수 타이머
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (turn === 'viewers' && !winner && timeLeft > 0) {
      timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timerId);
  }, [turn, winner, timeLeft]);

  // 💥 버그 수정: 0초가 되었을 때만 딱 한 번 실행되어 최다 득표수에 돌을 떨굼
  useEffect(() => {
    if (turn === 'viewers' && timeLeft === 0 && !winner) {
      let maxVote = -1;
      let selectedCol = 1;
      const currentVotes = votesRef.current;
      const currentBoard = boardRef.current;

      for (let i = 1; i <= COLS; i++) {
        if (currentVotes[i] > maxVote && !currentBoard[0][i-1]) {
          maxVote = currentVotes[i];
          selectedCol = i;
        }
      }
      dropPiece(selectedCol - 1, 'viewers');
    }
  }, [timeLeft, turn, winner]);

  const startTestMode = () => {
    setIsConnected(true);
    setChatLogs([{ id: 'system', nickname: '시스템', text: '테스트 모드: 1~7번 채팅이 쏟아집니다!' }]);
    
    const fakeNicknames = ['달구1호', '몽나바라기', '채팅빌런', '고수', '뉴비'];
    
    testIntervalRef.current = setInterval(() => {
      setTurn((currentTurn) => {
        if (currentTurn === 'viewers') {
          const randomNum = Math.floor(Math.random() * 7) + 1;
          const randomNick = fakeNicknames[Math.floor(Math.random() * fakeNicknames.length)];
          const newChat = { id: Date.now().toString() + Math.random(), nickname: randomNick, text: randomNum.toString() };
          
          setChatLogs(prev => [newChat, ...prev].slice(0, 15));
          setVotes(prev => ({ ...prev, [randomNum]: prev[randomNum] + 1 }));
        }
        return currentTurn;
      });
    }, 400); 
  };

  const stopConnection = () => {
    setIsConnected(false);
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
  };

  useEffect(() => {
    return () => { if (testIntervalRef.current) clearInterval(testIntervalRef.current); };
  }, []);

  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setTurn('streamer');
    setWinner(null);
    setVotes({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
          <button onClick={() => router.push('/minigames')} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, color: '#4a5568', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            ← 로비로 돌아가기
          </button>
          <h1 style={{ marginLeft: '24px', fontSize: '24px', fontWeight: 900, color: '#1e293b', margin: 0 }}>
            💬 1 vs N 채팅 사목게임
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '350px' }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', border: '3px solid #1e293b', boxShadow: '4px 4px 0px #1e293b' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px', color: '#1e293b' }}>채팅 연결 (봇 연동용)</h2>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <input type="text" value={bjId} onChange={(e) => setBjId(e.target.value)} disabled={isConnected} placeholder="SOOP 아이디 입력" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #cbd5e1', outline: 'none', fontWeight: 700 }} />
                {!isConnected ? (
                  <button onClick={() => alert('추후 Firebase에서 데이터를 읽어오도록 연결됩니다!')} style={{ background: '#facc15', border: '2px solid #1e293b', borderRadius: '10px', padding: '0 16px', fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0px #1e293b' }}>DB연결</button>
                ) : (
                  <button onClick={stopConnection} style={{ background: '#ef4444', border: '2px solid #1e293b', borderRadius: '10px', padding: '0 16px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>중지</button>
                )}
              </div>

              {!isConnected && (
                <button onClick={startTestMode} style={{ width: '100%', marginTop: '16px', background: '#e2e8f0', border: '2px solid #1e293b', padding: '12px', borderRadius: '10px', fontWeight: 800, color: '#1e293b', cursor: 'pointer', boxShadow: '2px 2px 0px #1e293b' }}>
                  🧪 가짜 시청자로 테스트 시작
                </button>
              )}
            </div>

            <div style={{ marginTop: '20px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '16px', height: '400px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8', marginBottom: '12px' }}>실시간 채팅 집계 (1~7)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatLogs.map((chat) => (
                  <div key={chat.id} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 800, color: '#8b5cf6' }}>{chat.nickname}</span>
                    <span style={{ color: '#334155', fontWeight: 600 }}>{chat.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: '2', minWidth: '500px' }}>
            <div style={{ background: '#ffffff', padding: '30px', borderRadius: '24px', border: '3px solid #1e293b', boxShadow: '4px 4px 0px #1e293b', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              <div style={{ marginBottom: '20px', textAlign: 'center', minHeight: '60px' }}>
                {winner ? (
                  <div style={{ background: '#fef08a', padding: '12px 30px', borderRadius: '20px', border: '3px solid #eab308', animation: 'bounce 0.5s' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#854d0e' }}>
                      {winner === 'streamer' ? '👑 몽나 승리!' : winner === 'viewers' ? '🎉 달구 승리!' : '🤝 무승부!'}
                    </h2>
                    <button onClick={resetGame} style={{ marginTop: '10px', background: '#ffffff', border: '2px solid #854d0e', borderRadius: '8px', padding: '6px 16px', fontWeight: 800, cursor: 'pointer' }}>다시 하기</button>
                  </div>
                ) : (
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: turn === 'streamer' ? '#8b5cf6' : '#ec4899', background: turn === 'streamer' ? '#f5f3ff' : '#fdf2f8', padding: '10px 24px', borderRadius: '99px', display: 'inline-block' }}>
                      {turn === 'streamer' ? '🎮 몽나(스트리머)의 턴!' : `⏳ 달구(시청자) 투표 중... (${timeLeft}초)`}
                    </h2>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                      {turn === 'streamer' ? '원하는 칸을 클릭해서 돌을 두세요.' : '채팅창에 1~7 숫자를 입력하면 다수결로 돌을 둡니다!'}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', width: '420px', height: '60px', alignItems: 'flex-end', padding: '0 10px' }}>
                {Array.from({ length: COLS }).map((_, i) => {
                  const num = i + 1;
                  const maxVotes = Math.max(...Object.values(votes), 1);
                  const height = turn === 'viewers' ? (votes[num] / maxVotes) * 100 : 0;
                  
                  return (
                    <div key={`vote-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ec4899' }}>{votes[num] > 0 ? votes[num] : ''}</div>
                      <div style={{ width: '60%', height: '40px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: `${height}%`, background: '#f472b6', transition: 'height 0.2s' }}></div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#475569' }}>{num}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#3b82f6', padding: '12px', borderRadius: '16px', border: '4px solid #1d4ed8', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.2)' }}>
                {board.map((row, rIndex) => (
                  <div key={rIndex} style={{ display: 'flex' }}>
                    {row.map((cell, cIndex) => (
                      <div 
                        key={`${rIndex}-${cIndex}`} 
                        onClick={() => handleStreamerClick(cIndex)}
                        style={{ 
                          width: '56px', height: '56px', margin: '4px', borderRadius: '50%', 
                          background: cell === 'streamer' ? '#a855f7' : cell === 'viewers' ? '#ec4899' : '#1e3a8a', 
                          border: cell ? '4px solid #ffffff' : '4px solid #1e40af',
                          boxShadow: cell ? 'inset -3px -3px 6px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.2)' : 'inset 4px 4px 8px rgba(0,0,0,0.4)',
                          cursor: (turn === 'streamer' && !winner && !board[0][cIndex]) ? 'pointer' : 'default',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px'
                        }}
                      >
                        {cell === 'streamer' && '💜'}
                        {cell === 'viewers' && '🐹'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
