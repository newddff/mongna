export const CAFE_NOTICE_URL = 'https://cafe.naver.com/f-e/cafes/31747136/menus/5?viewType=L';
export type BroadcastNotice = { id: string; title: string; summary: string; author: string; publishedAt: string; url: string };
// Stable public author identity from the broadcast-alert board; not a login token.
const MONGNA_MEMBER_KEY = 'jOsCYY7SXyDXrlliUvwiYyVgJpyI7ZTSbtga9eKkbH8';
function text(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] || whole;
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
    }).replace(/\r\n/g, '\n').trim().slice(0, limit);
}
export function latestBroadcastNotice(payload: any, now = Date.now()): BroadcastNotice | null {
  if (!Array.isArray(payload?.result?.articleList)) throw new Error('Invalid cafe response');
  const notices: BroadcastNotice[] = [];
  for (const entry of payload.result.articleList) {
    const article = entry?.item;
    if (entry?.type !== 'ARTICLE' || article?.cafeId !== 31747136 || article?.menuId !== 5 ||
        article.writerInfo?.memberKey !== MONGNA_MEMBER_KEY || article.openArticle !== true || article.blindArticle === true) continue;
    const id = String(article.articleId || ''), timestamp = article.writeDateTimestamp;
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(timestamp) || timestamp <= 0 || timestamp > now) continue;
    const title = text(article.subject, 300);
    if (!title) continue;
    notices.push({ id, title, summary: text(article.summary, 1600), author: text(article.writerInfo.nickName, 80) || '몽나',
      publishedAt: new Date(timestamp).toISOString(), url: `https://cafe.naver.com/nightofmongna/${id}` });
  }
  notices.sort((a,b) => b.publishedAt.localeCompare(a.publishedAt) || Number(b.id) - Number(a.id));
  return notices[0] || null;
}
