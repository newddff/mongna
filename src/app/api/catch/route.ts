import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    
    // 💡 아까 120개 데이터를 무사히 가져왔던 증명된 API 주소입니다.
    const urls = [
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=50&type=user_clip`,
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=50` 
    ];

    let rawItems: any[] = [];
    let fetchLogs = "";

    for (const url of urls) {
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json && Array.isArray(json.data)) rawItems.push(...json.data);
                else if (json && json.data && Array.isArray(json.data.list)) rawItems.push(...json.data.list);
            } else {
                fetchLogs += `[${res.status}] `;
            }
        } catch (e) {
            fetchLogs += "[Err] ";
        }
    }

    if (rawItems.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "err", title: `[자동화 에러] 데이터 0개. 로그: ${fetchLogs}`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
        });
    }

    // 💡 '이번 주' 랭킹을 위해 최근 7일(일주일)로 기간 설정
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map((c: any, index: number) => {
        if (!c || typeof c !== 'object') return null;

        const id = c.catch_no || c.uc_no || c.clip_no || c.no || c.bbs_no;
        if (!id) return null;

        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || c.date || '';
        if (regDateStr) {
            const videoTime = new Date(String(regDateStr).replace(' ', 'T')).getTime();
            if (videoTime && !isNaN(videoTime) && videoTime < oneWeekAgo) return null;
        }

        // 🚨 0초 필터 삭제! 길이가 확실히 30분(1800초)을 넘어가는 진짜 찐 풀영상만 막습니다.
        let sec = 0;
        const d = c.file_duration || c.duration || c.play_time || 0;
        if (typeof d === 'number') sec = d;
        else if (typeof d === 'string') {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + (parts[2]||0);
            else if (parts.length === 2) sec = parts[0]*60 + (parts[1]||0);
            else sec = parseInt(d, 10) || 0;
        }
        if (sec > 1800) return null; 

        // 🚨 제목 필터 완전 삭제! 다시보기 제목을 그대로 써도 통과시킵니다.
        const title = String(c.title_name || c.title || c.vod_title || c.catch_title || c.name || '제목 없음');

        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png';
        if (String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.');
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const views = parseInt(String(c.read_cnt || c.view_cnt || c.count || 0).replace(/,/g, ''), 10) || 0;
        
        const isCatch = Boolean(c.catch_no || c.catch_title || String(thumb).includes('catch'));
        const url = isCatch ? `https://vod.sooplive.co.kr/player/${id}/catch` : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) uniqueMap.set(item?.id, item);
    }

    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    if (hotClips.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "empty", title: "최근 7일 내 생성된 레전드 캐치가 아직 없습니다!", thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
        });
    }

    return NextResponse.json({ clips: hotClips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ 
        clips: [{ id: "err_srv", title: `[서버에러] ${error.message}`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
    });
  }
}
