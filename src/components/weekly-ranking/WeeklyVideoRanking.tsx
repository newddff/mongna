'use client';

import { useEffect, useState } from 'react';
import type { WeeklyRanking, VideoKind } from '../../lib/video-ranking';
import styles from './weekly-ranking.module.css';
const names: Record<VideoKind, string> = { clip: '클립', catch: '캐치' };
const channelUrls = { clip: 'https://www.sooplive.com/station/pinktape8/vod/clip', catch: 'https://www.sooplive.com/station/pinktape8/vod/catch' };
function koreanTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
export default function WeeklyVideoRanking() {
  const [data, setData] = useState<WeeklyRanking | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(false);
    const timeout = setTimeout(() => controller.abort(), 25000);
    fetch('/api/clips', { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!body.rankings?.clip || !body.rankings?.catch || !body.period?.from || !body.period?.to) throw new Error('invalid ranking');
      if (active) setData(body);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [reload]);
  useEffect(() => {
    const interval = setInterval(() => { if (document.visibilityState === 'visible') setReload(value => value + 1); }, 300000);
    return () => clearInterval(interval);
  }, []);
  return <section className={styles.section} aria-label="주간 클립·캐치 조회수 랭킹" aria-busy={loading}>
    <div className={styles.header}>
      <div><h2 className={styles.eyebrow}>MONGNA WEEKLY</h2></div>
      <button className={styles.refresh} disabled={loading} onClick={() => setReload(value => value + 1)}>{loading ? '불러오는 중…' : '새로고침'}</button>
    </div>
    <p className={styles.description}>최근 7일에 올라온 몽나 방송 클립·캐치의 누적 조회수 TOP 5</p>
    {data && <p className={styles.period}>{koreanTime(data.period.from)} ~ {koreanTime(data.period.to)} · 한국 시간 · 약 5분마다 갱신</p>}
    {error && <p role="status" className={styles.warning}>랭킹을 불러오지 못했어요. 잠시 후 새로고침해 주세요.{data ? ' 아래는 마지막으로 불러온 순위예요.' : ''}</p>}
    <div className={styles.groups}>
      {(['clip', 'catch'] as VideoKind[]).map(kind => {
        const group = data?.rankings[kind];
        return <section key={kind} className={styles.panel} aria-label={`${names[kind]} 조회수 TOP 5`}>
          <div className={styles.panelHeader}><h3><span>{kind === 'clip' ? '▶' : '✦'}</span> {names[kind]} <small>TOP 5</small></h3><a href={channelUrls[kind]} target="_blank" rel="noopener noreferrer">전체 보기 ↗</a></div>
          {group?.status === 'partial' && <p className={styles.warning}>일부 영상만 확인됐어요. 현재 수집된 영상 기준 순위예요.</p>}
          {group?.status === 'error' ? <p role="status" className={styles.empty}>SOOP에서 {names[kind]} 목록을 받아오지 못했어요.</p> : group?.items.length ? <ol className={styles.list}>
            {group.items.map((video, index) => <li key={video.id}>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className={styles.video}>
                <span className={`${styles.rank} ${index === 0 ? styles.first : ''}`}>{index + 1}</span>
                <div className={styles.thumb}>{video.thumb ? <img src={video.thumb} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : <span>{kind === 'clip' ? '▶' : '✦'}</span>}</div>
                <div className={styles.details}><strong>{video.title}</strong><span>{video.creator || 'SOOP'} · {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).format(new Date(video.publishedAt))}</span><b>조회수 {video.views.toLocaleString('ko-KR')}회</b></div>
              </a>
            </li>)}
          </ol> : <p className={styles.empty}>{loading && !data ? '순위를 불러오고 있어요…' : error && !data ? '새로고침해서 다시 확인해 주세요.' : `최근 7일에 올라온 ${names[kind]} 영상이 없어요.`}</p>}
        </section>;
      })}
    </div>
    <p className={styles.note}>영상에 표시된 누적 조회수 기준이며, 이번 주에 증가한 조회수 순위는 아니에요.</p>
  </section>;
}
