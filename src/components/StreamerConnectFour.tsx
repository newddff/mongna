'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../lib/use-soop-chat';
import { parseChatVote } from '../lib/chat-vote';

const ROWS = 6;
const COLS = 7;
type Player = 'streamer' | 'viewers' | null;

export default function StreamerConnectFour({ connected, subscribe }: {
  connected: boolean; subscribe: (listener: (chat: ChatMessage) => void) => () => void;
}) {
  
  const [chatLogs, setChatLogs] = useState<{ id: string; nickname: string; text: string }[]>([]);
  
  const [board, setBoard] = useState<Player[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [turn, setTurn] = useState<'streamer' | 'viewers'>('streamer');
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  
  const [votes, setVotes] = useState<{ [key: number]: number }>({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
  const [timeLeft, setTimeLeft] = useState(10); 

  const voters = useRef(new Set<string>());
  const connectedRef = useRef(connected);
  const winnerRef = useRef(winner);
  useEffect(() => { connectedRef.current = connected; }, [connected]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  const votesRef = useRef(votes);
  const boardRef = useRef(board);
  const turnRef = useRef(turn);
  useEffect(() => { votesRef.current = votes; }, [votes]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { turnRef.current = turn; }, [turn]);

  // 승리 조건 검사
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
    if (winnerRef.current || !connectedRef.current) return;
    const newBoard = boardRef.current.map(row => [...row]);
    
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newBoard[r][colIndex]) {
        newBoard[r][colIndex] = player;
        boardRef.current = newBoard;
        setBoard(newBoard);
        
        if (checkWin(newBoard, player)) {
          winnerRef.current = player;
          setWinner(player);
        } else if (newBoard.flat().every(cell => cell !== null)) {
          winnerRef.current = 'draw';
          setWinner('draw');
        } else {
          const nextTurn = player === 'streamer' ? 'viewers' : 'streamer';
          turnRef.current = nextTurn;
          setTurn(nextTurn);
          if (nextTurn === 'viewers') {
            voters.current.clear();
            votesRef.current = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 };
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
    if (!connected || turnRef.current !== 'streamer' || winnerRef.current || boardRef.current[0][colIndex]) return;
    dropPiece(colIndex, 'streamer');
  };

  // 타이머 (1초씩 차감)
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (connected && turn === 'viewers' && !winner && timeLeft > 0) {
      timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timerId);
  }, [connected, turn, winner, timeLeft]);

  // 타이머 0초 도달 시 1등에게 돌 떨구기
  useEffect(() => {
    if (connected && turn === 'viewers' && timeLeft === 0 && !winner) {
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
  }, [connected, timeLeft, turn, winner]);

  useEffect(() => subscribe(chat => {
    if (!connectedRef.current) return;
    const text = chat.text.trim();
    setChatLogs(prev => [{ id: crypto.randomUUID(), nickname: chat.nickname, text }, ...prev].slice(0, 15));
    const num = parseChatVote(text);
    if (turnRef.current !== 'viewers' || winnerRef.current || !num || !chat.userId ||
        boardRef.current[0][num - 1] || voters.current.has(chat.userId)) return;
    voters.current.add(chat.userId);
    setVotes(prev => {
      const next = { ...prev, [num]: prev[num] + 1 };
      votesRef.current = next;
      return next;
    });
  }), [subscribe]);

  const resetGame = () => {
    const empty = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    boardRef.current = empty; turnRef.current = 'streamer'; winnerRef.current = null;
    voters.current.clear();
    setBoard(empty);
    setTurn('streamer');
    setWinner(null);
    setVotes({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <h2 style={{ marginBottom: 20 }}>💬 몽나 vs 달구 채팅 사목게임</h2>
        {!connected && <p role="status">채팅 연결이 완료될 때까지 게임과 투표가 일시정지됩니다.</p>}

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '350px' }}>
            <p>시청자 턴에 채팅으로 1~7을 입력하세요. 한 턴에 한 사람당 한 표를 받습니다.</p>
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

          <div style={{ flex: '2', minWidth: '280px', overflowX: 'auto' }}>
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
                      {turn === 'streamer' ? '원하는 칸을 클릭해서 돌을 두세요.' : '채팅창에 1~7 숫자를 입력하면 다수결로 돌을 둡니다!' }
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
                          cursor: (connected && turn === 'streamer' && !winner && !board[0][cIndex]) ? 'pointer' : 'default',
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
