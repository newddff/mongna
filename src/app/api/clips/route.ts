import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    // 💡 1. 종우님 아이디어 적용: 일주일 전 ~ 오늘 날짜 계산
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().split('T')[0];

    // 💡 2. 오직 '유저클립'과 '캐치' 전용 API만 타격 (전체 VOD 주소는 아예 삭제)
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=50&type=user_clip&period=directinput&start_date=${startDate}&end_date=${endDate}`,
      `https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=50` // 캐치는 별도 전용 API가 존재함
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

    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        const id = c.catch_no || c.uc_no || c.title_no || c.bbs_no;
        if (!id) return null;

        // ✨ 3. 철벽 방어 필터: 영상 길이(초)를 무조건 계산해냅니다.
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

        // 🚨 4. [가장 중요] 롱폼(다시보기) 강제 컷오프!
        // 영상 길이가 20분(1200초)을 넘어가면 묻지도 따지지도 않고 버립니다(return null).
        const isCatch = Boolean(c.catch_no || c.catch_title);
        const isClip = Boolean(c.uc_no || c.uc_thumb);
        if (sec > 1200) return null; 
        if (sec === 0 && !isCatch && !isClip) return null; // 정체를 알 수 없는 영상도 차단!

        // 나머지 데이터(제목, 썸네일, 조회수)는 숏폼임이 확정된 녀석들만 예쁘게 다듬습니다.
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
    }).filter(Boolean); // 여기서 null 처리된 다시보기들이 깔끔하게 싹 날아갑니다.

    // 💡 5. 중복 제거
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 💡 6. 이번 주 최강 숏폼 3대장 정렬!
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
