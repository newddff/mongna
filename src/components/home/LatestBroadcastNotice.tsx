'use client';
import { useEffect, useState } from 'react';
import { CAFE_NOTICE_URL } from '../../lib/broadcast-notice';
import type { BroadcastNotice } from '../../lib/broadcast-notice';
import styles from './home.module.css';
export default function LatestBroadcastNotice() {
  const [notice, setNotice] = useState<BroadcastNotice | null>(null);
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort(); controller = new AbortController();
      const current = controller;
      const timeout = setTimeout(() => current.abort(), 18000);
      try {
        const response = await fetch('/api/broadcast-notice', { signal: current.signal });
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (!Object.prototype.hasOwnProperty.call(data, 'notice')) throw new Error('invalid response');
        if (active && current === controller) { setNotice(data.notice); setFailed(false); }
      } catch { if (active && current === controller) setFailed(true); }
      finally { clearTimeout(timeout); if (active && current === controller) setLoading(false); }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 120000);
    return () => { active = false; clearInterval(timer); controller?.abort(); };
  }, []);
  const date = notice ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(notice.publishedAt)) : '';
  return <section className={`${styles.panel} ${styles.noticePanel}`} aria-label="최신 방송공지" aria-busy={loading}>
    <div className={styles.panelHeading}><h2>몽나의 방송공지</h2><span>방송 알람</span></div>
    {notice ? <article className={styles.noticeArticle}>
      <div className={styles.noticeMeta}><span>{notice.author}</span><time dateTime={notice.publishedAt}>{date}</time></div>
      <a className={styles.noticeTitle} href={notice.url} target="_blank" rel="noopener noreferrer">{notice.title}</a>
      <p className={styles.noticeSummary}>{notice.summary || '공지 내용은 팬카페 원문에서 확인해 주세요.'}</p>
    </article> : <div className={styles.noNotice}><span>◇</span><p role="status">{loading ? '방송공지를 불러오고 있어요.' : failed ? '지금은 공지를 불러오지 못했어요.' : '공개된 방송공지가 없어요.'}</p></div>}
    {notice && failed && <p className={styles.noticeWarning}>갱신이 지연돼 마지막으로 불러온 공지를 표시하고 있어요.</p>}
    <a href={notice?.url || CAFE_NOTICE_URL} className={styles.subtleLink} target="_blank" rel="noopener noreferrer">{notice ? '팬카페에서 공지 보기' : '방송 알람 게시판 보기'}<span>↗</span></a>
  </section>;
}
