import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    const nocache = Date.now();

    // 🚨 핵심: 만악의 근원이었던 type=all 을 완.전.히 삭제했습니다!
    // 오직 종우님이 알려주신 '유저클립(user_clip)'과 '캐치(catch)' 전용 API만 찌릅니다.
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=user_clip&_t=${nocache}`,
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch&_t=${nocache}`,
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=20&_t=${nocache}` // 캐치 전용 예비 주소
    ];

    const responses = await Promise.all(urls.map(url => fetch(url, { headers, cache: 'no-store' }).catch(() => null)));

    let rawItems: any[] = [];
    for (const res of responses) {
        if (!res || !res.ok) continue;
        const json = await res.json().catch(() => null);
        if (json && Array.isArray(json.data)) {
            rawItems.push(...json.data);
        } else if (json && json.data && Array.isArray(json.data.list)) {
            rawItems.push(...json.data.list);
        }
    }

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        // 고유 번호
        const id = c.title_no || c.catch_no || c.uc_no || c.bbs_no;
        if (!id) return null;

        // 제목
        const title = c.title_name || c.title || c.vod_title || '제목 없음';

        // 썸네일 (강제 https 변환)
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        // 조회수
        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        // 플레이어 URL (캐치인지 유저클립인지 구별해서 연결)
        const isCatch = Boolean(c.catch_no || (thumb && thumb.includes('catch')) || c.catch_title);
        const url = isCatch
            ? `https://vod.sooplive.co.kr/player/${id}/catch`
            : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean); // null 값(찌꺼기) 완벽 제거

    // 중복된 영상이 2번 뜨지 않도록 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 조회수 높은 순서대로 딱 3개만 자르기!
    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
