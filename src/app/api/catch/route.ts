import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    // SOOP 서버가 봇(Bot)으로 의심하지 않도록 일반 브라우저처럼 위장합니다.
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://bj.afreecatv.com',
        'Referer': `https://bj.afreecatv.com/${soopId}/vods/clip`
    };
    const nocache = Date.now();

    // 💡 캐치와 유저클립 최신 URL 구조 반영 (한 번에 100개씩 넉넉히 가져옵니다)
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=100&type=user_clip&_t=${nocache}`, // 일반 클립
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=100&_t=${nocache}` // 숏폼 캐치
    ];

    const responses = await Promise.all(urls.map(url => fetch(url, { headers, cache: 'no-store' }).catch(() => null)));

    let rawItems: any[] = [];
    for (const res of responses) {
        if (!res || !res.ok) continue;
        const json = await res.json().catch(() => null);
        
        // SOOP API 응답 구조 2가지 모두 대응
        if (json && Array.isArray(json.data)) {
            rawItems.push(...json.data);
        } else if (json && json.data && Array.isArray(json.data.list)) {
            rawItems.push(...json.data.list);
        }
    }

    // 💡 테스트를 위해 임시로 '최근 30일(한 달)'로 기간을 늘립니다. 
    // 나중에 데이터가 잘 뜨면 숫자 30을 다시 7로 바꾸시면 됩니다.
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        const isCatch = Boolean(c.catch_no || c.catch_title || (c.thumb_path && c.thumb_path.includes('catch')));
        const isClip = Boolean(c.uc_no || c.uc_thumb || c.uc_title || (c.thumb && c.thumb.includes('clip')));

        if (!isCatch && !isClip) return null;

        const id = c.catch_no || c.uc_no || c.bbs_no || c.title_no;
        if (!id) return null;

        // 날짜 필터링 적용 (30일 이내)
        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || '';
        if (regDateStr) {
            const safeDateStr = regDateStr.replace(' ', 'T');
            const videoTime = new Date(safeDateStr).getTime();
            if (videoTime && videoTime < oneMonthAgo) return null;
        }

        let sec = 0;
        const d = c.file_duration || c.duration || c.play_time;
        if (typeof d === 'number') sec = d;
        else if (typeof d === 'string') {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + (parts[2]||0);
            else if (parts.length === 2) sec = parts[0]*60 + (parts[1]||0);
            else sec = parseInt(d, 10) || 0;
        }
        if (sec > 1200) return null; 

        const title = c.title_name || c.title || c.vod_title || c.catch_title || '제목 없음';
        
        // 썸네일 고화질(bg) 처리
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || '';
        if(thumb.includes('_sm.')) thumb = thumb.replace('_sm.', '_bg.'); // 고화질 썸네일로 교체
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        const url = isCatch
            ? `https://vod.sooplive.co.kr/player/${id}/catch`
            : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 조회수 순으로 3개 뽑기
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
