import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    const nocache = Date.now();

    // 💡 1. 숲 서버가 날짜 파라미터를 못 알아먹으니, 안전하게 최신순으로 50개씩 넉넉히 가져옵니다.
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

    // 💡 2. 우리 코드가 직접 '일주일 전' 날짜(시간)를 정확하게 계산합니다.
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        const id = c.catch_no || c.uc_no || c.title_no || c.bbs_no;
        if (!id) return null;

        // ✨ 3. [기간 필터] 영상이 일주일보다 더 전에 올라온 거라면 가차 없이 컷오프!
        const regDateStr = c.reg_date || c.board_reg_date || '';
        if (regDateStr) {
            // 날짜 포맷 안전 변환 (예: 2026-09-17 15:30:00 -> 2026-09-17T15:30:00)
            const safeDateStr = regDateStr.replace(' ', 'T');
            const videoTime = new Date(safeDateStr).getTime();
            
            if (videoTime && videoTime < oneWeekAgo) {
                return null; // 이번 주 영상이 아니면 버림!
            }
        }

        // ✨ 4. [롱폼 필터] 영상 길이(초)를 계산해서 20분(1200초) 넘으면 다시보기로 간주하고 컷오프!
        let sec = 0;
        const d = c.file_duration || c.duration || c.play_time;
        if (typeof d === 'number') {
            sec = d;
        } else if (typeof d === 'string') {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) sec = parts[0]*3600 + parts[1]*60 + (parts[2]||0);
            else if (parts.length === 2) sec = parts[0]*60 + (parts[1]||0);
            else sec = parseInt(d, 10) || 0;
        }

        const isCatch = Boolean(c.catch_no || c.catch_title);
        const isClip = Boolean(c.uc_no || c.uc_thumb);
        if (sec > 1200) return null; // 롱폼 차단

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
    }).filter(Boolean); // 찌꺼기(null) 완벽 청소

    // 💡 5. 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 💡 6. 이번 주에 올라온 진짜 숏폼 중에서 조회수 1~3등 정렬!
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
