import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    
    // 💡 SOOP 서버가 일반 사용자로 인식하도록 꼼꼼하게 헤더 위장
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://ch.sooplive.co.kr',
        'Referer': `https://ch.sooplive.co.kr/${soopId}/vods/clip`
    };

    // 💡 새롭게 바뀐 SOOP 전용 API 주소 (chapi.sooplive.co.kr)
    // - 클립: /api/{아이디}/vods?type=user_clip
    // - 캐치: /api/{아이디}/catchs
    const urls = [
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=100&type=user_clip`,
      `https://chapi.sooplive.co.kr/api/${soopId}/catchs?page=1&per_page=100`
    ];

    const responses = await Promise.all(urls.map(url => fetch(url, { headers, cache: 'no-store' }).catch(() => null)));

    let rawItems: any[] = [];
    for (const res of responses) {
        if (!res || !res.ok) continue;
        const json = await res.json().catch(() => null);
        
        // SOOP API가 뱉어내는 다양한 JSON 껍데기 모두 대응
        if (json && Array.isArray(json.data)) {
            rawItems.push(...json.data);
        } else if (json && json.data && Array.isArray(json.data.list)) {
            rawItems.push(...json.data.list);
        }
    }

    // 💡 기간 필터: 우선 확실하게 데이터가 뜨는지 보기 위해 30일(한 달)로 넉넉하게 잡습니다. 
    // 나중에 데이터 뜨는 거 확인하시면 숫자 30을 다시 7로 바꾸세요!
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        const isCatch = Boolean(c.catch_no || c.catch_title || (c.thumb_path && c.thumb_path.includes('catch')));
        const isClip = Boolean(c.uc_no || c.uc_thumb || c.uc_title || (c.thumb && c.thumb.includes('clip')));

        if (!isCatch && !isClip) return null;

        const id = c.catch_no || c.uc_no || c.bbs_no || c.title_no;
        if (!id) return null;

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

        // 제목 및 썸네일 파싱 (최신 구조 반영)
        const title = c.title_name || c.title || c.vod_title || c.catch_title || '제목 없음';
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || '';
        if(thumb.includes('_sm.')) thumb = thumb.replace('_sm.', '_bg.'); 
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        // 플레이어 주소도 sooplive.co.kr 로 변경
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
