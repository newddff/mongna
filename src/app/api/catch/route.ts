import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 💡 1. 막힐 일 없는 모바일 웹 캐치 페이지 통째로 긁어오기
    const mobileUrl = `https://m.sooplive.co.kr/station/${soopId}/catch`;
    const res = await fetch(mobileUrl, { headers, cache: 'no-store' });

    if (!res.ok) {
        return NextResponse.json({ clips: [{ id: "err1", title: `[에러] 페이지 접근 실패 (${res.status})`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] });
    }

    const html = await res.text();
    const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);

    if (!match || !match[1]) {
        return NextResponse.json({ clips: [{ id: "err2", title: "[에러] 데이터 구조를 찾을 수 없습니다.", thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] });
    }

    const preloadedState = JSON.parse(match[1]);
    
    // 💡 2. 데이터 추출 (SOOP이 숨겨둔 곳을 정확히 찌릅니다)
    const catchList = preloadedState?.station?.catchList?.data || preloadedState?.catch?.list || [];

    if (!Array.isArray(catchList) || catchList.length === 0) {
        return NextResponse.json({ clips: [{ id: "err3", title: "최근 생성된 캐치가 없습니다.", thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] });
    }

    // 💡 3. 깐깐한 필터 싹 다 버리고 무조건 띄우기 (0초, 다시보기 제목 모두 허용)
    const parsedItems = catchList.map((c: any, index: number) => {
        if (!c) return null;

        const id = c.catch_no || c.uc_no || c.clip_no || c.no || `catch-${index}`;
        const title = String(c.title_name || c.title || c.catch_title || '제목 없음');

        let thumb = c.thumb_path || c.thumb || c.catch_thumb || c.thumbnail || 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png';
        if (String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.');
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const views = parseInt(String(c.read_cnt || c.view_cnt || c.count || 0).replace(/,/g, ''), 10) || 0;
        const url = `https://vod.sooplive.co.kr/player/${id}/catch`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    // 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) uniqueMap.set(item?.id, item);
    }

    // 조회수 랭킹 정렬
    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ clips: [{ id: "err4", title: `[서버에러] ${error.message}`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] });
  }
}
