import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // 캐시 파괴 유지

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    // 💡 1. 숲 서버가 자꾸 말을 안 들으니, 3가지 가능성을 전부 찔러서 한 번에 싹 다 긁어옵니다.
    const urls = [
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=30&type=all`,
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=30&type=catch`,
      `https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=30&type=clip`
    ];

    const responses = await Promise.all(urls.map(url => fetch(url, { headers, cache: 'no-store' }).catch(() => null)));

    let rawItems: any[] = [];
    for (const res of responses) {
        if (!res || !res.ok) continue;
        const json = await res.json().catch(() => null);
        // 데이터가 배열(Array) 형태로 어디에 숨어있든 다 끄집어냅니다.
        if (json && Array.isArray(json.data)) {
            rawItems.push(...json.data);
        } else if (json && json.data && Array.isArray(json.data.list)) {
            rawItems.push(...json.data.list);
        }
    }

    // 💡 2. 데이터 추출 및 정규화 (이름표가 달라도 무조건 찾아냄!)
    const parsedItems = rawItems.map(c => {
        if (!c || typeof c !== 'object') return null;

        const id = c.title_no || c.catch_no || c.uc_no || c.bbs_no || c.vod_no;
        if (!id) return null;

        // 🚨 제목 오류 완벽 해결: 다시보기(title_name)든 클립(title)이든 다 찾아냅니다!
        const title = c.title_name || c.title || c.vod_title || c.subject || '제목 없음';

        // 🚨 썸네일 오류 완벽 해결: 어떤 경로(thumb_path, uc_thumb)로 주든 강제로 https 붙여서 추출!
        let thumb = c.thumb_path || c.thumb || c.uc_thumb || c.catch_thumb || c.thumbnail || c.poster || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        // 🚨 조회수 오류 완벽 해결
        const viewsStr = c.read_cnt || c.view_cnt || c.total_view_cnt || c.watch_cnt || 0;
        const views = parseInt(String(viewsStr).replace(/,/g, ''), 10) || 0;

        // 💡 3. ✨ 영상 길이(시간) 정밀 측정 -> 다시보기를 걸러낼 핵심 무기!
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

        // 4. 전용 플레이어 URL 조립 (캐치는 전용 주소 사용)
        const isCatch = Boolean(c.catch_no || (thumb && thumb.includes('catch')));
        const url = isCatch
            ? `https://vod.sooplive.co.kr/player/${id}/catch`
            : `https://vod.sooplive.co.kr/player/${id}`;

        return { id, title, thumb, views, sec, url };
    }).filter(Boolean);

    // 💡 5. 똑같은 영상이 여러 개 딸려오지 않게 중복 제거!
    const uniqueMap = new Map();
    for (const item of parsedItems) {
        if (!uniqueMap.has(item?.id)) {
            uniqueMap.set(item?.id, item);
        }
    }

    // 💡 6. 🏆 [최종 필터링] 영상 길이가 30분(1800초) 이하인 숏폼/클립만 100% 살려내고 정렬!
    const hotClips = Array.from(uniqueMap.values())
        .filter((c: any) => c.sec <= 1800) // 🚨 다시보기 철벽 차단 필터
        .sort((a: any, b: any) => b.views - a.views) // 조회수 1~3등
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
