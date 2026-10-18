import styles from './anniversaries.module.css';

type Props = { debutDays: number; birthDDay: number };

export default function CalendarAnniversaries({ debutDays, birthDDay }: Props) {
  return (
    <section className={`calendar-anniversaries ${styles.section}`} aria-label="몽나 기념일">
      <div className={styles.grid}>
        <article className={styles.card} aria-labelledby="mongna-debut-title">
          <div className={styles.heading}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="11" y="4" width="10" height="17" rx="5" />
                <path d="M7 15v1a9 9 0 0 0 18 0v-1M16 25v4m-5 0h10M12 10h3m2 0h3m-8 4h3m2 0h3" />
              </svg>
            </span>
            <h2 id="mongna-debut-title">몽나 방송 시작한 지</h2>
            <span className={styles.sparkle} aria-hidden="true">✦</span>
          </div>
          <div className={styles.details}>
            <p className={styles.count}><span className={styles.prefix}>D+</span>{debutDays}<span className={styles.unit}>일</span></p>
            <div className={styles.date}><span>첫 방송</span><time dateTime="2023-11-18">2023. 11. 18</time></div>
          </div>
        </article>
        <article className={`${styles.card} ${styles.birthday}`} aria-labelledby="mongna-birthday-title">
          <div className={styles.heading}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 28h22M7 28V17a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11M7 20c2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0M11 15v-4m10 4v-4m-5 4V9" />
                <path d="M11 5c-3 3-2 5 0 5s3-2 0-5Zm10 0c-3 3-2 5 0 5s3-2 0-5ZM16 2c-3 3-2 5 0 5s3-2 0-5Z" />
              </svg>
            </span>
            <h2 id="mongna-birthday-title">다가오는 생일</h2>
            <span className={styles.sparkle} aria-hidden="true">✦</span>
          </div>
          <div className={styles.details}>
            {birthDDay === 0 ? (
              <p className={styles.birthdayToday}>오늘이 바로 생일! 🥳</p>
            ) : (
              <p className={styles.count}><span className={styles.prefix}>D−</span>{birthDDay}<span className={styles.unit}>일</span></p>
            )}
            <div className={styles.date}><span>생일</span><time dateTime="2000-03-05">2000. 03. 05</time></div>
          </div>
        </article>
      </div>
    </section>
  );
}
