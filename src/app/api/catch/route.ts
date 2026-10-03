import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    // 💡 SOOP의 클립, 캐치 주소 2곳을 찌릅니다.
    const urls = [
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=100&type=user_clip`,
      `https://chapi.sooplive.co.kr/api/${soopId}/catchs?page=1&per_page=100`
    ];

    let rawItems: any[] = [];

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
            }
        } catch (e: any) {}
    }

    if (rawItems.length === 0) {
        return NextResponse.json({ clips: [] });
    }

    // 💡 기간 30일 (데이터 뜨는거 확인하시면 7로 바꾸시면 됩니다!)
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map((c: any) => {
        if (!c || typeof c !== 'object') return null;
        
        // 1. 아이디 추출 (SOOP이 이름을 뭘로 바꿨든 다 걸리게 그물망 촘촘히!)
        const id = c.catch_no || c.uc_no || c.bbs_no || c.title_no || c.vod_no || c.no;
        if (!id) return null;

        // 2. 날짜 확인
        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || c.date || '';
        if (regDateStr) {
            const safeDateStr = String(regDateStr).replace(' ', 'T');
            const videoTime = new Date(safeDateStr).getTime();
            if (videoTime && !isNaN(videoTime) && videoTime < oneMonthAgo) return null;
        }

        // 3. 숏폼 필터 (명찰 검사 대신, 길이가 20분 이하면 무조건 클립/캐치로 인정!)
        let sec = 0;
        const d = c.file_duration || c.duration || c.play_time || 0;
        if (typeof d === 'number') sec = d;
        else if (typeof d === 'string') {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + (parts[2]||0);
            else if (parts.length === 2) sec = parts[0]*60 + (parts[1]||0);
            else sec = parseInt(d, 10) || 0;
        }
        if (sec > 1200) return null; 

        // 4. 제목, 썸네일, 조회수 추출
        const title = c.title_name || c.title || c.vod_title || c.catch_title || c.name || '제목 없음';
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || 'https://via.placeholder.com/640x360.png?text=SOOP';
        if(String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.'); 
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || c.count || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        // 5. 캐치 vs 일반 클립 URL 연결
        const isCatch = Boolean(c.catch_no || c.catch_title || String(thumb).includes('catch'));
        const url = isCatch ? `https://vod.sooplive.co.kr/player/${id}/catch` : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    // 🚨 혹시라도 또 구조가 바뀌어서 0개가 되면 화면에 데이터 구조를 출력해 주는 안전망
    if (parsedItems.length === 0 && rawItems.length > 0) {
        return NextResponse.json({ 
            clips: [{
                id: "error-struct",
                title: `데이터 구조 확인용: ${JSON.stringify(rawItems[0]).substring(0, 80)}...`,
                thumb: "https://via.placeholder.com/640x360.png?text=Fix+Me",
                views: 0,
                url: "#"
            }] 
        });
    }

    // 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 조회수 순으로 TOP 3 정렬!
    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error: any) {
    return NextResponse.json({ clips: [] });
  }
}
