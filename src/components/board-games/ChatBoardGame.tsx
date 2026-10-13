'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../lib/use-soop-chat';
import { BoardEngine, Move, Point, Side, coord } from '../../lib/board-games/types';
import { ConnectFour } from '../../lib/board-games/connect-four';
import { Gomoku } from '../../lib/board-games/gomoku';
import { ChessGame } from '../../lib/board-games/chess';
import { Formation, Janggi } from '../../lib/board-games/janggi';
import { VoteRound } from '../../lib/board-games/vote-round';
import styles from './board-games.module.css';

export type GameKind = BoardEngine['kind'];
export const GAME_INFO = {
  'connect-four': { title: '사목', subtitle: '네 개의 돌, 하나의 승부', icon: '◉', command: '1~7', description: '채팅으로 열 번호를 골라 네 돌을 연결하세요.', rules: '가로·세로·대각선으로 네 돌을 연결하면 승리합니다.', duration: 10 },
  gomoku: { title: '오목', subtitle: '한 수씩, 다섯 개의 연결', icon: '✦', command: 'H8', description: '채팅으로 좌표를 골라 다섯 돌을 연결하세요.', rules: '15×15 자유룰입니다. 삼삼·사사 금수 없이 다섯 돌 이상 연결하면 승리합니다.', duration: 15 },
  chess: { title: '체스', subtitle: '다 같이 생각하는 체크메이트', icon: '♞', command: 'e2e4', description: '출발 칸과 도착 칸을 채팅으로 입력하세요.', rules: '체크·캐슬링·앙파상·프로모션을 적용합니다. 승격은 q/r/b/n, 생략하면 퀸입니다.', duration: 30 },
  janggi: { title: '장기', subtitle: '몽나와 달구의 한 판 승부', icon: '楚', command: 'a4a5', description: '출발 좌표와 도착 좌표를 채팅으로 입력하세요.', rules: '친선 규칙: 장군 회피, 빅장, 동일 국면 3회 반복·연속 한수쉼 2회는 무승부입니다. 대회 점수제는 사용하지 않습니다.', duration: 30 },
};
const formations: { value: Formation; label: string }[] = [{ value: 'heeh', label: '마 · 상 · 상 · 마' }, { value: 'hehe', label: '마 · 상 · 마 · 상' }, { value: 'eheh', label: '상 · 마 · 상 · 마' }, { value: 'ehhe', label: '상 · 마 · 마 · 상' }];
function makeEngine(kind: GameKind, cho: Formation = 'heeh', han: Formation = 'heeh'): BoardEngine {
  return kind === 'gomoku' ? new Gomoku() : kind === 'chess' ? new ChessGame() : kind === 'janggi' ? new Janggi(cho, han) : new ConnectFour();
}
const equal = (a?: Point | null, b?: Point | null) => a && b && a.r === b.r && a.c === b.c;
type Phase = 'idle' | 'open' | 'tie' | 'empty';
export default function ChatBoardGame({ kind, enabled, subscribe }: {
  kind: GameKind; enabled: boolean; subscribe: (callback: (message: ChatMessage) => void) => () => void;
}) {
  const info = GAME_INFO[kind];
  const model = useRef<BoardEngine | null>(null); if (!model.current) model.current = makeEngine(kind);
  const engine = model.current;
  const round = useRef(new VoteRound());
  const [revision, setRevision] = useState(0);
  const [streamerSide, setStreamerSide] = useState<Side>(0);
  const [draftSide, setDraftSide] = useState<Side>(0);
  const [cho, setCho] = useState<Formation>('heeh'), [han, setHan] = useState<Formation>('heeh');
  const [duration, setDuration] = useState(info.duration), [remaining, setRemaining] = useState(info.duration);
  const [roundDuration, setRoundDuration] = useState(info.duration);
  const [phase, setPhase] = useState<Phase>('idle');
  const [ranked, setRanked] = useState<{ key: string; count: number }[]>([]);
  const [ties, setTies] = useState<string[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);
  const [promotion, setPromotion] = useState('q');
  const [history, setHistory] = useState<{ label: string; actor: string; key: string }[]>([]);
  const [chats, setChats] = useState<{ nickname: string; key: string; id: number }[]>([]);
  const sequence = useRef(0);
  const state = useRef({ enabled, phase, streamerSide, duration });
  state.current = { enabled, phase, streamerSide, duration };
  const finishRef = useRef<() => void>();
  const commit = (key: string) => {
    const current = model.current!;
    if (!state.current.enabled || current.result) return;
    const actor = current.side === state.current.streamerSide ? '몽나' : '달구';
    // Close this vote epoch synchronously before mutating the board.
    const previousPhase = state.current.phase; state.current.phase = 'idle';
    if (!current.play(key)) { state.current.phase = previousPhase; return; }
    const move = current.lastMove!;
    round.current.clear(); setRanked([]); setTies([]); setSelected(null);
    setHistory(prev => [...prev, { label: move.label, actor, key: move.key }]);
    const nextPhase: Phase = !current.result && current.side !== state.current.streamerSide ? 'open' : 'idle';
    state.current.phase = nextPhase; setPhase(nextPhase); setRemaining(state.current.duration); setRoundDuration(state.current.duration);
    setRevision(value => value + 1);
  };
  const finish = () => {
    if (!state.current.enabled || state.current.phase !== 'open' || model.current!.side === state.current.streamerSide) return;
    state.current.phase = 'idle';
    const leaders = round.current.leaders(model.current!);
    if (!leaders.length) { state.current.phase = 'empty'; setPhase('empty'); setRemaining(0); return; }
    if (leaders.length > 1) { state.current.phase = 'tie'; setPhase('tie'); setTies(leaders); setRemaining(0); return; }
    commit(leaders[0]);
  };
  finishRef.current = finish;
  useEffect(() => subscribe(chat => {
    const current = state.current;
    if (!current.enabled || current.phase !== 'open' || model.current!.side === current.streamerSide) return;
    const key = round.current.cast(chat.userId, chat.text, model.current!); if (!key) return;
    setRanked(round.current.ranked());
    const id = ++sequence.current;
    setChats(prev => [{ nickname: chat.nickname, key, id }, ...prev].slice(0, 12));
  }), [subscribe]);
  useEffect(() => {
    if (!enabled || phase !== 'open' || engine.result || engine.side === streamerSide || remaining <= 0) return;
    const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [enabled, phase, remaining, revision, streamerSide]);
  useEffect(() => { if (enabled && phase === 'open' && remaining === 0) finishRef.current?.(); }, [enabled, phase, remaining]);

  const restartVote = () => {
    if (!enabled || engine.result || engine.side === streamerSide) return;
    round.current.clear(); setRanked([]); setTies([]); setChats([]); setRemaining(duration); setRoundDuration(duration); setPhase('open'); state.current.phase = 'open';
  };
  const newGame = () => {
    if (history.length && !window.confirm('이 대국을 끝내고 새 대국을 시작할까요?')) return;
    model.current = makeEngine(kind, cho, han);
    round.current.clear(); setRanked([]); setTies([]); setSelected(null); setChats([]); setHistory([]);
    setStreamerSide(draftSide); setRemaining(duration); setRoundDuration(duration); setPhase(draftSide === 0 ? 'idle' : 'open');
    state.current = { ...state.current, streamerSide: draftSide, phase: draftSide === 0 ? 'idle' : 'open' };
    setRevision(value => value + 1);
  };
  const moves = engine.moves();
  const suggested = selected ? moves.filter(move => equal(move.from, selected)) : [];
  const selectCell = (r: number, c: number) => {
    if (!enabled || engine.result) return;
    const p = { r, c };
    if (kind === 'gomoku' || kind === 'connect-four') {
      if (engine.side === streamerSide) commit(kind === 'gomoku' ? coord(p, engine.rows) : String(c + 1));
      return;
    }
    const candidates = moves.filter(move => equal(move.from, selected) && equal(move.to, p));
    if (engine.side === streamerSide && candidates.length) {
      commit((candidates.find(move => move.key.endsWith(promotion)) || candidates[0]).key); return;
    }
    setSelected(engine.cells()[r][c]?.side === engine.side ? p : null);
  };
  const viewerTurn = engine.side !== streamerSide;
  const actor = viewerTurn ? '달구' : '몽나';
  const outcome = engine.result;
  const maxVotes = ranked[0]?.count || 1;
  const cells = engine.cells();
  const grid = <div className={`${styles.board} ${styles[kind === 'connect-four' ? 'connectBoard' : kind === 'gomoku' ? 'gomokuBoard' : kind === 'chess' ? 'chessBoard' : 'janggiBoard']}`} style={{ gridTemplateColumns: `repeat(${engine.cols}, 1fr)`, aspectRatio: `${engine.cols}/${engine.rows}` }} aria-label={`${info.title} 보드`}>
    {kind === 'janggi' && <svg className={styles.janggiLines} viewBox="0 0 540 600" aria-hidden="true">
      {Array.from({ length: 10 }, (_, r) => <line key={`r${r}`} x1="30" x2="510" y1={30 + r * 60} y2={30 + r * 60} />)}
      {Array.from({ length: 9 }, (_, c) => <line key={`c${c}`} y1="30" y2="570" x1={30 + c * 60} x2={30 + c * 60} />)}
      {[0, 7].map(r => <g key={r}><line x1="210" y1={30 + r * 60} x2="330" y2={150 + r * 60} /><line x1="330" y1={30 + r * 60} x2="210" y2={150 + r * 60} /></g>)}
    </svg>}
    {cells.map((row, r) => row.map((cell, c) => {
      const p = { r, c }, last = equal(engine.lastMove?.to, p), target = suggested.some(move => equal(move.to, p));
      const owner = cell ? (cell.side === streamerSide ? '몽나' : '달구') : '빈칸';
      return <button key={`${r}-${c}`} type="button" data-square={coord(p, engine.rows)} aria-label={`${coord(p, engine.rows).toUpperCase()} ${owner}${cell ? ' ' + cell.label : ''}`} aria-pressed={Boolean(equal(selected, p))}
        className={`${styles.cell} ${styles[kind === 'chess' ? ((r + c) % 2 ? 'darkSquare' : 'lightSquare') : 'intersection']} ${last ? styles.lastCell : ''} ${equal(selected, p) ? styles.selectedCell : ''} ${target ? styles.targetCell : ''}`}
        onClick={() => selectCell(r, c)} disabled={!enabled || Boolean(outcome)}>
        {kind === 'connect-four' ? <span className={`${styles.hole} ${cell ? (cell.side === streamerSide ? styles.mongnaStone : styles.viewerStone) : ''}`} /> : cell ? <span className={`${styles.piece} ${styles[kind === 'chess' ? 'chessPiece' : kind === 'gomoku' ? 'gomokuPiece' : 'janggiPiece']} ${cell.side === 0 ? styles.firstPiece : styles.secondPiece}`}>{kind === 'gomoku' ? '' : cell.label}</span> : target ? <span className={styles.targetDot} /> : kind === 'gomoku' && [3, 7, 11].includes(r) && [3, 7, 11].includes(c) ? <span className={styles.starPoint} /> : null}
        {last && <span className={styles.lastMarker} />}
      </button>;
    }))}
  </div>;
  return <section className={styles.gameLayout} aria-label={`${info.title} 대국`}>
    <div className={styles.mainPanel}>
      <div className={styles.boardHeader}><div><span className={styles.eyebrow}>MONGNA vs DALGU</span><h2>{info.title}<span>{kind === 'gomoku' ? '자유룰' : kind === 'janggi' ? '친선' : '채팅 대결'}</span></h2></div>
        <div className={`${styles.turnBadge} ${viewerTurn ? styles.viewerBadge : ''}`}>{outcome ? '대국 종료' : `${actor}의 차례`}</div></div>
      {!enabled && <div className={styles.notice}>채팅 연결을 기다리는 동안 대국과 투표가 일시정지됩니다.</div>}
      {outcome && <div className={styles.result}>{outcome.winner === null ? '무승부' : outcome.winner === streamerSide ? '몽나 승리!' : '달구 승리!'}<small>{outcome.reason}</small></div>}
      {engine.check() && !outcome && <div className={styles.notice}>{kind === 'chess' ? '체크!' : '장군!'} {actor}가 왕을 지키는 수를 두어야 합니다.</div>}
      <div className={styles.boardArea}>
        <div className={styles.columnLabels} style={{ gridTemplateColumns: `repeat(${engine.cols},1fr)` }}>{Array.from({ length: engine.cols }, (_, c) => <span key={c}>{kind === 'connect-four' ? c + 1 : String.fromCharCode(65 + c)}</span>)}</div>
        <div className={styles.boardWithRanks}><div className={styles.rankLabels}>{Array.from({ length: engine.rows }, (_, r) => <span key={r}>{engine.rows - r}</span>)}</div>{grid}</div>
      </div>
      <div className={styles.boardFooter}><span><i className={styles.mongnaDot} />몽나 · {streamerSide === 0 ? (kind === 'chess' ? '백' : kind === 'janggi' ? '초' : '선공') : (kind === 'chess' ? '흑' : kind === 'janggi' ? '한' : '후공')}</span><span><i className={styles.viewerDot} />달구 · 시청자</span><span>{history.length}수 진행</span></div>
      {(kind === 'chess' || kind === 'janggi') && <div className={styles.moveHelp}>
        <span>{selected ? `${coord(selected, engine.rows).toUpperCase()}에서 가능한 수` : '말을 누르면 가능한 이동과 채팅 명령을 볼 수 있어요.'}</span>
        {kind === 'chess' && <label>승격 <select value={promotion} onChange={e => setPromotion(e.target.value)}><option value="q">퀸</option><option value="r">룩</option><option value="b">비숍</option><option value="n">나이트</option></select></label>}
        {selected && <div className={styles.moveCommands}>{suggested.slice(0, 30).map(move => <code key={move.key}>{move.key}</code>)}</div>}
        {kind === 'janggi' && <div className={styles.specialMoves}>{moves.filter(move => !move.from).map(move => <button key={move.key} onClick={() => commit(move.key)} disabled={!enabled || viewerTurn}>{move.label} <code>{move.key === 'pass' ? '쉼' : '빅장'}</code></button>)}</div>}
      </div>}
      <details className={styles.rules}><summary>게임 규칙과 채팅 참여 방법</summary><p>{info.rules}</p><p>유효한 첫 채팅 한 번만 집계합니다. {kind === 'janggi' ? '한 수 쉼은 쉼, 빅장 수락은 빅장을 입력하세요.' : ''} 좌표는 화면에 표시된 글자와 숫자를 사용합니다.</p></details>
    </div>
    <aside className={styles.sidePanel}>
      <section className={styles.votePanel}>
        <div className={styles.panelHeading}><h3>달구의 한 수</h3><span>LIVE VOTE</span></div>
        <p className={styles.commandHint}>{info.description} <code>{info.command}</code></p>
        <div className={styles.voteStats}><div><strong>{viewerTurn && !outcome ? remaining : '—'}</strong><span>남은 초</span></div><div><strong>{round.current.size}</strong><span>참여한 달구</span></div></div>
        <div className={styles.progress}><span style={{ width: `${viewerTurn ? Math.min(100, remaining / roundDuration * 100) : 0}%` }} /></div>
        <p className={styles.voteStatus}>{outcome ? '대국이 끝났어요.' : !enabled ? '연결 대기 · 투표 일시정지' : !viewerTurn ? '몽나가 수를 두면 투표가 시작돼요.' : phase === 'tie' ? '동률이에요. 몽나가 최종 수를 선택해주세요.' : phase === 'empty' ? '유효한 투표가 없어요. 다시 집계해주세요.' : '채팅 투표를 받고 있어요.'}</p>
        <div className={styles.voteList}>{ranked.slice(0, 5).map(vote => <div key={vote.key}><span><code>{vote.key}</code><b>{vote.count}표</b></span><i style={{ width: `${vote.count / maxVotes * 100}%` }} /></div>)}{!ranked.length && <div className={styles.emptyVotes}>첫 번째 달구의 한 수를 기다려요.</div>}</div>
        {phase === 'tie' && <div className={styles.tieChoices}>{ties.map(key => <button key={key} disabled={!enabled} onClick={() => commit(key)}>{key}</button>)}</div>}
        <div className={styles.voteControls}><button className={styles.primaryButton} disabled={!enabled || !viewerTurn || phase !== 'open' || Boolean(outcome)} onClick={finish}>지금 투표 마감</button><button disabled={!enabled || !viewerTurn || Boolean(outcome)} onClick={restartVote}>다시 집계</button></div>
        <label className={styles.settingLabel}>다음 투표 시간<select value={duration} onChange={e => setDuration(Number(e.target.value))}>{[10, 15, 30, 45, 60, 90].map(value => <option key={value} value={value}>{value}초</option>)}</select></label>
      </section>
      <section className={styles.setupPanel}><h3>새 대국 설정</h3><label className={styles.settingLabel}>몽나의 순서<select value={draftSide} onChange={e => setDraftSide(Number(e.target.value) as Side)}><option value={0}>선공{kind === 'chess' ? ' · 백' : kind === 'janggi' ? ' · 초' : ''}</option><option value={1}>후공{kind === 'chess' ? ' · 흑' : kind === 'janggi' ? ' · 한' : ''}</option></select></label>
        {kind === 'janggi' && <>{[[cho, setCho, '초 차림'], [han, setHan, '한 차림']].map(([value, setter, label]) => <label key={label as string} className={styles.settingLabel}>{label as string}<select value={value as string} onChange={e => (setter as typeof setCho)(e.target.value as Formation)}>{formations.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>)}</>}
        <button className={styles.newGameButton} onClick={newGame}>새 대국 시작</button></section>
      <section className={styles.historyPanel}><h3>최근 한 수</h3>{history.length ? history.slice(-8).reverse().map((move, index) => <div key={`${history.length}-${index}`}><span>{history.length - index}. {move.actor}</span><code>{move.key}</code></div>) : <p>첫 수를 기다리고 있어요.</p>}</section>
      <section className={styles.chatPanel}><h3>참여한 달구</h3>{chats.map(chat => <div key={chat.id}><span>{chat.nickname}</span><code>{chat.key}</code></div>)}</section>
    </aside>
  </section>;
}
