import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
    };
    
    // 💡 가장 확실하게 120개를 뚫고 가져왔던 chapi 주소 사용
    const urls = [
      `https://chapi.sooplive.co.kr/api/${soopId}/catchs?page=1&per_page=50`, 
      `https://chapi.sooplive.co.kr/api/${soopId}/vods?page=1&per_page=50&type=user_clip`
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
        } catch (e: any) { fetchLogs += "[Err] "; }
    }

    // 🚨 통신 완전 실패 시 화면 안 숨기고 원인 출력
    if (rawItems.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "debug1", title: `[에러] 데이터 0개. (SOOP 차단됨) 로그: ${fetchLogs}`, thumb: "https://via.placeholder.com/640x360.png?text=Empty", views: 0, url: "#" }] 
        });
    }

    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map((c: any) => {
        if (!c || typeof c !== 'object') return null;
        
        let sec = 0;
        const d = c.file_duration || c.duration || c.play_time || 0;
        if (typeof d === 'number') sec = d;
        else if (typeof d === 'string') {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + (parts[2]||0);
            else if (parts.length === 2) sec = parts[0]*60 + (parts[1]||0);
            else sec = parseInt(d, 10) || 0;
        }

        const title = String(c.title_name || c.title || c.vod_title || c.catch_title || '제목 없음');
        
        // 🚨 철통 방어: 제목에 다시보기/풀영상이 있거나, 길이가 0초이거나, 20분이 넘어가면 무조건 파기!
        if (title.includes('다시보기') || title.includes('풀영상')) return null;
        if (sec === 0 || sec > 1200) return null;

        const id = c.catch_no || c.uc_no || c.clip_no || c.no;
        if (!id) return null;

        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || c.date || '';
        if (regDateStr) {
            const videoTime = new Date(String(regDateStr).replace(' ', 'T')).getTime();
            if (videoTime && !isNaN(videoTime) && videoTime < oneMonthAgo) return null;
        }

        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png';
        if (String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.'); 
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (!String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const views = parseInt(String(c.read_cnt || c.view_cnt || c.count || 0).replace(/,/g, ''), 10) || 0;
        const url = `https://vod.sooplive.co.kr/player/${id}/catch`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    // 🚨 모든 데이터가 풀영상이라 필터에서 짤렸을 때 원인 출력
    if (parsedItems.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "debug2", title: `[필터됨] 총 ${rawItems.length}개를 가져왔으나, 0초 버그 또는 풀영상 필터로 전부 삭제됨.`, thumb: "https://via.placeholder.com/640x360.png?text=Filtered", views: 0, url: "#" }] 
        });
    }

    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) uniqueMap.set(item?.id, item);
    }

    const hotClips = Array.from(uniqueMap.values())
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ 
        clips: [{ id: "debug3", title: `[서버코드에러] ${error.message}`, thumb: "https://via.placeholder.com/640x360.png?text=Error", views: 0, url: "#" }] 
    });
  }
}
