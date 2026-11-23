'use client';

import { useEffect, useState } from 'react';
import { SONG_OVERLAY_CHANNEL, type SongOverlaySnapshot } from '../../../../lib/song-requests';
import styles from '../songs.module.css';

export default function SongOverlay() {
  const [snapshot, setSnapshot] = useState<SongOverlaySnapshot | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SONG_OVERLAY_CHANNEL);
    let timer: ReturnType<typeof setTimeout>;
    channel.onmessage = ({ data }) => {
      if (data !== null && (!data || !Array.isArray(data.upcoming))) return;
      clearTimeout(timer);
      setSnapshot(data);
      if (data !== null) timer = setTimeout(() => setSnapshot(null), 10000);
    };
    channel.postMessage('request');
    return () => { clearTimeout(timer); channel.close(); };
  }, []);

  if (!snapshot) return null;
  return <main className={styles.overlay}>
    <header>
      <span>{snapshot.current ? '현재 곡' : '재생 대기 중'}</span>
      {snapshot.current && <><strong>{snapshot.current.title}</strong><small>신청 · {snapshot.current.requestedBy}</small></>}
    </header>
    <h2>다음 곡</h2>
    {snapshot.upcoming.length > 0 ? <ol>
      {snapshot.upcoming.map((song, index) => <li key={index}><strong>{song.title}</strong><small>{song.requestedBy}</small></li>)}
    </ol> : <small>대기 중인 곡 없음</small>}
    {snapshot.remaining > 0 && <small className={styles.overlayRemaining}>외 {snapshot.remaining}곡</small>}
  </main>;
}
