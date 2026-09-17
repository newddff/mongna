import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    const nocache = Date.now();

    // 💡 1. 캐치와 유저클립 데이터 넉넉히 호출
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=50&type=user_clip&_t=${nocache}`,
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=50&_t=${nocache}`
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

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        // 🚨 2. [가장 핵심] 숏폼 명찰(신분증) 검사!!
        // 유저클립(uc_no)이나 캐치(catch_no) 고유 번호가 하나라도 있는지 확인합니다.
        const isCatch = Boolean(c.catch_no || c.catch_title || (c.thumb_path && c.thumb_path.includes('catch')));
        const isClip = Boolean(c.uc_no || c.uc_thumb || c.uc_title || (c.thumb && c.thumb.includes('clip')));

        // ✨ 명찰이 없는 놈(순수 다시보기)은 가차 없이 컷오프! (길이가 몇 초든 상관없이 무조건 버림)
        if (!isCatch && !isClip) return null;

        const id = c.catch_no || c.uc_no || c.bbs_no || c.title_no;
        if (!id) return null;

        // 3. 일주일 기간 필터 (이번 주 영상만 통과)
        const regDateStr = c.reg_date || c.board_reg_date || c.create_date || '';
        if (regDateStr) {
            const safeDateStr = regDateStr.replace(' ', 'T');
            const videoTime = new Date(safeDateStr).getTime();
            if (videoTime && videoTime < oneWeekAgo) return null;
        }

        // 4. 안전빵 이중 방어막 (명찰을 위조했어도 20분 넘어가면 컷오프)
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

        // 5. 예쁘게 다듬기
        const title = c.title_name || c.title || c.vod_title || '제목 없음';
        let thumb = c.thumb_path || c.uc_thumb || c.catch_thumb || c.thumb || c.thumbnail || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        const url = isCatch
            ? `https://vod.sooplive.co.kr/player/${id}/catch`
            : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, url };
    }).filter(Boolean);

    // 6. 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 7. 이번 주 최강 숏폼 3대장 정렬!
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
