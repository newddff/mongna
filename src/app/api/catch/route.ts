import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // 💡 1. SOOP 모바일 웹페이지의 '캐치' 탭 HTML 자체를 긁어옵니다. (API 차단 우회)
    const mobileUrl = `https://m.sooplive.co.kr/station/${soopId}/catch`;
    const res = await fetch(mobileUrl, { headers, cache: 'no-store' });
    
    if (!res.ok) {
        return NextResponse.json({ clips: [] });
    }

    const html = await res.text();

    // 💡 2. HTML 안쪽에 숨겨진 JSON 데이터를 정규식으로 쏙 빼냅니다!
    // SOOP은 화면을 그리기 위해 <script> 태그 안에 초기 데이터를 넣어둡니다.
    const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);
    if (!match || !match[1]) {
        return NextResponse.json({ clips: [] });
    }

    const preloadedState = JSON.parse(match[1]);
    
    // 💡 3. 캐치 데이터 리스트 추출
    // 데이터 구조가 깊숙한 곳에 숨어있으므로 조심스럽게 꺼냅니다.
    const catchList = preloadedState?.station?.catchList?.data || 
                      preloadedState?.catch?.list || 
                      [];

    if (!Array.isArray(catchList) || catchList.length === 0) {
        return NextResponse.json({ clips: [] });
    }

    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = catchList.map((c: any) => {
        if (!c) return null;

        // 명확하게 캐치/클립 ID가 있는 녀석들만 취급 (풀영상 원천 차단)
        const id = c.catch_no || c.uc_no || c.clip_no;
        if (!id) return null;

        const regDateStr = c.reg_date || c.create_date || '';
        if (regDateStr) {
            const videoTime = new Date(String(regDateStr).replace(' ', 'T')).getTime();
            if (videoTime && !isNaN(videoTime) && videoTime < oneMonthAgo) return null;
        }

        const title = String(c.title_name || c.title || c.catch_title || '');
        if (title.includes('다시보기') || title.includes('풀영상')) return null;

        let thumb = c.thumb_path || c.thumb || c.catch_thumb || '';
        if (thumb) {
            if (String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.'); 
            if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
            else if (!String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');
        } else {
            thumb = 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png'; 
        }

        const views = parseInt(String(c.read_cnt || c.view_cnt || 0).replace(/,/g, ''), 10) || 0;
        
        // 무조건 캐치 플레이어 주소로 연결
        const url = `https://vod.sooplive.co.kr/player/${id}/catch`;

        return { id, title: title || '제목 없음', thumb, views, url };
    }).filter(Boolean);

    // 중복 제거 및 랭킹 정렬
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) uniqueMap.set(item?.id, item);
    }

    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ clips: [] });
  }
}
