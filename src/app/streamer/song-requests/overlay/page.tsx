'use client';

import { useEffect, useState } from 'react';
import { SONG_OVERLAY_CHANNEL } from '../../../../lib/song-requests';
import styles from '../songs.module.css';

type Snapshot = { current: { title: string; requestedBy: string } | null; next: string | null };
export default function SongOverlay() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SONG_OVERLAY_CHANNEL);
    let timer: ReturnType<typeof setTimeout>;
    channel.onmessage = ({ data }) => {
      if (!data || typeof data !== 'object' || !('current' in data)) return;
      setSnapshot(data); clearTimeout(timer);
      timer = setTimeout(() => setSnapshot(null), 10000);
    };
    channel.postMessage('request');
    return () => { clearTimeout(timer); channel.close(); };
  }, []);
  return <main className={styles.overlay}>
    <strong>{snapshot?.current?.title ?? '재생 대기 중'}</strong>
    {snapshot?.current && <span>신청 {snapshot.current.requestedBy}</span>}
    {snapshot?.next && <span>다음 곡 · {snapshot.next}</span>}
  </main>;
}
