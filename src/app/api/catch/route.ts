import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    const nocache = Date.now();
    const urls = [
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=100&type=user_clip`,
      `https://chapi.sooplive.co.kr/api/${soopId}/catchs?page=1&per_page=100`,
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=100&type=user_clip&_t=${nocache}`,
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=100&_t=${nocache}`
    ];

    let rawItems: any[] = [];
    let fetchErrorLog = "";

    // Promise.all 대신 안전한 for-of 루프로 순차적 통신 진행 (타입 에러 방지)
    for (const url of urls) {
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json && Array.isArray(json.data)) {
                    rawItems.push(...json.data);
                } else if (json && json.data && Array.isArray(json.data.list)) {
                    rawItems.push(...json.data.list);
                }
            } else {
                fetchErrorLog += `[${res.status}] `;
            }
        } catch (e: any) {
            fetchErrorLog += `[FetchErr] `;
        }
    }

    if (rawItems.length === 0) {
        return NextResponse.json({ 
            clips: [{
                id: "error-1",
                title: `[에러] 데이터를 하나도 못 가져왔습니다. 상태 로그: ${fetchErrorLog}`,
                thumb: "https://via.placeholder.com/640x360.png?text=API+Error",
                views: 0,
                url: "#"
            }] 
        });
    }

    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map((c: any) => {
        if (!c || typeof c !== 'object') return null;

        const isCatch = Boolean(c.catch_no || c.catch_title || (c.thumb_path && String(c.thumb_path).includes('catch')));
        const isClip = Boolean(c.uc_no || c.uc_thumb || c.uc_title || (c.thumb && String(c.thumb).includes('clip')));

        if (!isCatch && !isClip) return null;
        
        const id = c.catch_no || c.uc_no || c.bbs_no || c.title_no;
        if (!id) return null;

        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || '';
        if (regDateStr) {
            const safeDateStr = String(regDateStr).replace(' ', 'T');
            const videoTime = new Date(safeDateStr).getTime();
            if (videoTime && videoTime < oneMonthAgo) return null;
        }

        const title = c.title_name || c.title || c.vod_title || c.catch_title || '제목 없음';
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || 'https://via.placeholder.com/640x360.png?text=No+Thumb';
        if(String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.'); 
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        const url = isCatch ? `https://vod.sooplive.co.kr/player/${id}/catch` : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    if (parsedItems.length === 0) {
        return NextResponse.json({ 
            clips: [{
                id: "error-2",
                title: `[필터링] 통신은 성공해서 ${rawItems.length}개를 가져왔지만, 30일 제한과 숏폼 조건에 모두 잘렸습니다.`,
                thumb: "https://via.placeholder.com/640x360.png?text=Filter+Error",
                views: 0,
                url: "#"
            }] 
        });
    }

    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, {
        headers: { 
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });

  } catch (error: any) {
    return NextResponse.json({ 
        clips: [{
            id: "error-3",
            title: `[서버 코드 폭발] ${String(error?.message || "알 수 없는 오류")}`,
            thumb: "https://via.placeholder.com/640x360.png?text=Server+Explosion",
            views: 0,
            url: "#"
        }] 
    });
  }
}
