import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    // 💡 1. 종우님이 찾아주신 꿀팁대로 오늘부터 정확히 일주일 전 날짜를 자동으로 계산합니다!
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // 오늘 날짜 (예: 2026-09-17)
    
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().split('T')[0]; // 7일 전 날짜 (예: 2026-09-10)

    // 💡 2. 숲(SOOP)이 인지하는 기간 설정 주소 파라미터(period=directinput&startDate=...&endDate=...) 적용!
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=30&type=user_clip&period=directinput&start_date=${startDate}&end_date=${endDate}`,
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=30&type=catch&period=directinput&start_date=${startDate}&end_date=${endDate}`,
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=30`
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

        const id = c.title_no || c.catch_no || c.uc_no || c.bbs_no;
        if (!id) return null;

        const title = c.title_name || c.title || c.vod_title || '제목 없음';

        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        const isCatch = Boolean(c.catch_no || (thumb && thumb.includes('catch')) || c.catch_title);
        const url = isCatch
            ? `https://vod.sooplive.co.kr/player/${id}/catch`
            : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    // 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 이번 주 숏폼 중 조회수 높은 순서대로 딱 3개 추출!
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
