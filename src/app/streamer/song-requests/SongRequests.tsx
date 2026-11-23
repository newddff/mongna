'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSoopChat, type ChatMessage } from '../../../lib/use-soop-chat';
import { DEMO_SONG_OVERLAY_CHANNEL, MAX_QUEUE, parseSongRequest, SONG_OVERLAY_CHANNEL, type Song, type SongOverlaySnapshot } from '../../../lib/song-requests';
import styles from './songs.module.css';

type Player = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  destroy(): void;
  getVideoData?(): { title?: string; video_id?: string };
};
type PlayerEvent = { target: Player; data: number };
type YouTube = { Player: new (el: HTMLElement, options: {
  playerVars: Record<string, string | number>;
  events: Record<string, (event: PlayerEvent) => void>;
}) => Player };
type YTWindow = Window & { YT?: YouTube; onYouTubeIframeAPIReady?: () => void };
let loader: Promise<YouTube> | undefined;
function loadYouTube() {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  return loader ??= new Promise<YouTube>((resolve, reject) => {
    const script = document.createElement('script');
    const prior = w.onYouTubeIframeAPIReady;
    const fail = () => {
      clearTimeout(timer); w.onYouTubeIframeAPIReady = prior;
      script.remove(); loader = undefined; reject(new Error('플레이어를 불러오지 못했어요.'));
    };
    const timer = setTimeout(fail, 12000);
    w.onYouTubeIframeAPIReady = () => {
      if (!w.YT?.Player) { fail(); return; }
      clearTimeout(timer); w.onYouTubeIframeAPIReady = prior; resolve(w.YT);
      prior?.();
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = fail;
    document.head.append(script);
  });
}

const DEMO_LINKS = [
  { id: 'M7lc1UVf-VE', title: 'YouTube 플레이어 예제' },
  { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny' },
];

export default function SongRequests({ demo = false, showDemo = false }: { demo?: boolean; showDemo?: boolean } = {}) {
  const demoViewer = useRef(0);
  const accepting = useRef(false);
  const session = useRef(0);
  const publishOverlay = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('곡이 대기열에 들어오면 재생 시작을 눌러주세요.');
  const [notice, setNotice] = useState('');
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<Song[]>([]);
  const queueRef = useRef<Song[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);
  const currentRef = useRef<Song | null>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const played = useRef(false);
  const automatic = useRef(false);
  const [ready, setReady] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [playerFailed, setPlayerFailed] = useState(false);
  const requests = useRef(Promise.resolve());
  const pending = useRef(new Set<string>());
  const lastRequest = useRef(new Map<string, number>());
  const active = useRef(false);
  const advanceRef = useRef<() => void>(() => {});

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  function updateQueue(next: Song[]) { queueRef.current = next; setQueue(next); }
  function updateCurrent(next: Song | null) { currentRef.current = next; setCurrent(next); }

  function toggleRequests() {
    accepting.current = !accepting.current;
    if (!accepting.current) ++session.current;
    setOpen(accepting.current);
  }

  function enqueue(chat: ChatMessage, manual = false) {
    if (!active.current || (!manual && (!accepting.current || !chat.userId))) {
      if (demo && !accepting.current) setNotice('채팅 접수를 먼저 열어주세요. 닫혀 있을 때는 신청을 받지 않아요.');
      return;
    }
    const request = parseSongRequest(chat.text);
    if (demo && request?.kind !== 'link') {
      setNotice('모의 채팅에는 !신청곡 뒤에 유튜브 링크를 넣어주세요.'); return;
    }
    if (!request) { if (manual) setNotice('가수 - 곡명 또는 유튜브 링크를 입력해주세요.'); return; }
    if (queueRef.current.length + pending.current.size >= MAX_QUEUE) {
      setNotice('대기열이 가득 찼어요.'); return;
    }
    const id = chat.userId;
    const now = Date.now();
    if (pending.current.has(id) || (!manual && (
      now - (lastRequest.current.get(id) ?? 0) < 30000 ||
      currentRef.current?.userId === id || queueRef.current.some(s => s.userId === id)
    ))) return;
    pending.current.add(id);
    if (!manual) {
      if (lastRequest.current.size >= 500) lastRequest.current.delete(lastRequest.current.keys().next().value!);
      lastRequest.current.set(id, now);
    }
    const sessionId = session.current;
    const valid = () => active.current && (manual || (accepting.current && session.current === sessionId));
    requests.current = requests.current.then(async () => {
      if (!valid()) return;
      let song: { videoId: string; title: string };
      if (request.kind === 'link') {
        song = { videoId: request.videoId,
          title: (demo && DEMO_LINKS.find(item => item.id === request.videoId)?.title) || `유튜브 영상 (${request.videoId})` };
      } else {
        const response = await fetch('/api/soop/song-search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: request.query }), signal: AbortSignal.timeout(10000),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '곡을 찾지 못했어요.');
        song = result;
      }
      if (!valid()) return;
      if (currentRef.current?.videoId === song.videoId || queueRef.current.some(s => s.videoId === song.videoId)) {
        setNotice('이미 재생 중이거나 대기 중인 곡이에요.'); return;
      }
      updateQueue([...queueRef.current, { ...song, requestedBy: chat.nickname || '시청자', userId: id }]);
      setNotice(`${chat.nickname || '시청자'}님의 신청곡을 추가했어요.`);
    }).catch(error => {
      if (valid()) setNotice(error instanceof Error && error.name === 'Error' ? error.message : '신청곡을 추가하지 못했어요.');
    }).finally(() => { pending.current.delete(id); });
  }

  const connection = useSoopChat(enqueue, '/streamer/song-requests', !demo);
  const authenticated = connection.authenticated;
  const available = demo || authenticated;
  function sendDemoChat(text: string) {
    const viewer = ++demoViewer.current;
    enqueue({ userId: `demo-${viewer}`, nickname: `테스트 시청자 ${viewer}`, text });
  }

  function advance() {
    if (!player.current) return;
    const [next, ...rest] = queueRef.current;
    automatic.current = true;
    played.current = false;
    updateCurrent(next ?? null);
    if (!next) {
      player.current.stopVideo();
      setStatus('대기 중인 곡이 없어요.');
      return;
    }
    updateQueue(rest);
    player.current.loadVideoById(next.videoId);
    setStatus('신청곡을 불러오고 있어요.');
  }
  advanceRef.current = advance;

  useEffect(() => {
    if (ready && automatic.current && !currentRef.current && queueRef.current.length) advanceRef.current();
  }, [queue, ready]);

  useEffect(() => {
    if (!available) return;
    let disposed = false;
    let instance: Player | undefined;
    setPlayerFailed(false);
    loadYouTube().then(yt => {
      if (disposed || !mount.current) return;
      const anchor = document.createElement('div');
      mount.current.replaceChildren(anchor);
      instance = new yt.Player(anchor, {
        playerVars: { playsinline: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => { if (!disposed) { player.current = target; setReady(true); } },
          onStateChange: ({ target, data }) => {
            const playing = currentRef.current;
            if (disposed || !playing) return;
            const video = target.getVideoData?.();
            if (video?.video_id && video.video_id !== playing.videoId) return;
            if (data === 1) {
              played.current = true;
              setStatus('재생 중');
              if (video?.title && playing.title !== video.title) updateCurrent({ ...playing, title: video.title });
            } else if (data === 0 && played.current) advanceRef.current();
            else if (data === 2) setStatus('일시 정지');
          },
          onAutoplayBlocked: () => { if (!disposed) setStatus('자동 재생이 차단됐어요. 재생 버튼을 눌러주세요.'); },
          onError: () => {
            if (disposed || !currentRef.current) return;
            setNotice(`재생할 수 없는 곡을 건너뛰었어요: ${currentRef.current.title}`);
            advanceRef.current();
          },
        },
      });
    }).catch(() => { if (!disposed) { setPlayerFailed(true); setStatus('유튜브 플레이어를 불러오지 못했어요.'); } });
    return () => {
      disposed = true; player.current = null; setReady(false); instance?.destroy();
    };
  }, [available, playerAttempt]);

  useEffect(() => {
    if (available) return;
    accepting.current = false; ++session.current; setOpen(false); updateCurrent(null); played.current = false; automatic.current = false;
  }, [available]);

  useEffect(() => {
    if (!available || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(demo ? DEMO_SONG_OVERLAY_CHANNEL : SONG_OVERLAY_CHANNEL);
    const publish = () => {
      const playing = currentRef.current;
      const waiting = queueRef.current;
      const details = ({ title, requestedBy }: Song) => ({ title, requestedBy });
      const snapshot: SongOverlaySnapshot = {
        current: playing ? details(playing) : null,
        upcoming: waiting.slice(0, 3).map(details),
        remaining: Math.max(0, waiting.length - 3),
      };
      channel.postMessage(snapshot);
    };
    publishOverlay.current = publish;
    channel.onmessage = event => { if (event.data === 'request') publish(); };
    publish();
    const timer = setInterval(publish, 4000);
    return () => {
      clearInterval(timer);
      channel.postMessage(null);
      channel.close();
      publishOverlay.current = null;
    };
  }, [available, demo]);

  useEffect(() => { publishOverlay.current?.(); }, [current, queue]);

  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.top}><Link href={demo ? '/streamer/song-requests' : '/streamer/minigames'}>{demo ? '← 실제 연동 화면' : '← 방송 도구'}</Link>
      {showDemo && <Link href="/streamer/song-requests/demo">로그인 없이 테스트 ↗</Link>}
      {available && <a href={demo ? '/streamer/song-requests/demo/overlay' : '/streamer/song-requests/overlay'} target="_blank" rel="noreferrer">곡 정보 오버레이 ↗</a>}</header>
    <h1>{demo ? '몽나 신청곡 · 프리뷰 테스트' : '몽나 신청곡'}</h1>
    <p>채팅으로 신청하고, 접수된 순서대로 재생해요.</p>
    <section className={styles.card}>
      <strong role="status">{demo ? '모의 채팅 · 실제 SOOP 방송에는 연결하지 않아요.' : connection.status}</strong>
      <div className={styles.actions}>
        {!demo && (!authenticated ? <button disabled={connection.busy} onClick={connection.startAuth}>SOOP 계정 연결</button>
          : <button disabled={connection.busy || connection.connected} onClick={connection.retryNow}>채팅 다시 연결</button>)}
        {available && <button disabled={!demo && !connection.connected && !open} aria-pressed={open} onClick={toggleRequests}>{open ? '채팅 접수 닫기' : '채팅 접수 열기'}</button>}
      </div>
      <p>{open ? '시청자 신청곡을 받고 있어요.' : '채팅 접수가 꺼져 있어요. 이미 받은 곡은 계속 재생할 수 있어요.'}</p>
      <p>{!demo && <><code>!신청곡 아이유 - 밤편지</code> 또는 </>}<code>!신청곡 유튜브링크</code></p>
      {demo && <div className={styles.actions}>{DEMO_LINKS.map((item, index) => <button key={item.id}
        onClick={() => sendDemoChat(`!신청곡 https://youtu.be/${item.id}`)}>예시 영상 {index + 1} 신청</button>)}</div>}
    </section>
    {available && <div className={styles.grid}>
      <section className={styles.card}>
        <h2>현재 곡</h2>
        <div className={styles.video} ref={mount} />
        <p><strong>{current?.title || '선택된 곡 없음'}</strong>{current && <> · {current.requestedBy}</>}</p>
        <p role="status">{status}</p>
        <div className={styles.actions}>
          {playerFailed && <button onClick={() => setPlayerAttempt(value => value + 1)}>플레이어 다시 불러오기</button>}
          <button disabled={!ready || (!current && !queue.length)} onClick={() => {
            if (!currentRef.current) { advance(); return; }
            automatic.current = true;
            player.current?.playVideo();
          }}>
            {current ? '재생' : '재생 시작'}
          </button>
          <button disabled={!ready || !current} onClick={() => player.current?.pauseVideo()}>일시 정지</button>
          <button disabled={!ready || !current} onClick={advance}>건너뛰기</button>
        </div>
      </section>
      <section className={styles.card}>
        <h2>대기열 <span>{queue.length}곡</span></h2>
        <form className={styles.form} onSubmit={event => {
          event.preventDefault();
          if (demo) { sendDemoChat(input.trim().startsWith('!신청곡 ') ? input : `!신청곡 ${input}`); return; }
          enqueue({ userId: 'manual', nickname: '몽나', text: `!신청곡 ${input}` }, true);
        }}>
          <input aria-label="직접 추가할 곡" placeholder={demo ? "유튜브 링크 또는 신청곡 명령어" : "가수 - 곡명 또는 유튜브 링크"} value={input} onChange={event => setInput(event.target.value)} />
          <button disabled={!input.trim()}>{demo ? '모의 채팅 전송' : '추가'}</button>
        </form>
        <p role="status">{notice}</p>
        {queue.length === 0 ? <p>대기 중인 곡이 없어요.</p> : <ol className={styles.queue}>{queue.map((song, index) => <li key={song.videoId}>
          <span><strong>{index + 1}. {song.title}</strong><small>{song.requestedBy}</small></span>
          <button aria-label={`${song.title} 삭제`} onClick={() => updateQueue(queueRef.current.filter(item => item.videoId !== song.videoId))}>삭제</button>
        </li>)}</ol>}
      </section>
    </div>}
  </div></main>;
}
