import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    
    // 💡 종우님이 찾아주신 1번 주소 (클립 탭) -> 숲 공식 API 'user_clip' 호출
    const clipRes = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=user_clip`, { headers, cache: 'no-store' });
    const clipJson = await clipRes.json().catch(() => ({}));
    const clipList = Array.isArray(clipJson?.data) ? clipJson.data : (clipJson?.data?.list || []);

    // 💡 종우님이 찾아주신 2번 주소 (캐치 탭) -> 숲 공식 API 'catchs' 전용 주소 호출! (vods가 아니었음!)
    const catchRes = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/catchs?page=1&per_page=20`, { headers, cache: 'no-store' });
    let catchJson = await catchRes.json().catch(() => ({}));
    
    // (혹시 catchs 주소가 막히면 예비용으로 vods?type=catch 호출)
    if (!catchJson?.data) {
        const catchRes2 = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch`, { headers, cache: 'no-store' });
        catchJson = await catchRes2.json().catch(() => ({}));
    }
    const catchList = Array.isArray(catchJson?.data) ? catchJson.data : (catchJson?.data?.list || []);

    const allShorts = [];

    // 🎯 유저클립(Clip) 데이터 예쁘게 다듬기
    for (const c of clipList) {
        const id = c.title_no || c.uc_no || c.bbs_no;
        if (!id) continue;
        
        let thumb = c.uc_thumb || c.thumb || c.thumbnail || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;

        allShorts.push({
            id: `clip_${id}`, // 겹치지 않게 이름표 붙이기
            title: c.title || c.vod_title || '제목 없음',
            thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image',
            views: parseInt(String(c.read_cnt || c.view_cnt || 0).replace(/,/g, ''), 10) || 0,
            url: `https://vod.sooplive.co.kr/player/${id}` // 클립 플레이어 주소
        });
    }

    // 🎯 캐치(Catch) 데이터 예쁘게 다듬기
    for (const c of catchList) {
        const id = c.catch_no || c.title_no;
        if (!id) continue;
        
        let thumb = c.thumb_path || c.thumb || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;

        allShorts.push({
            id: `catch_${id}`, // 겹치지 않게 이름표 붙이기
            title: c.title_name || c.title || '제목 없음',
            thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image',
            views: parseInt(String(c.view_cnt || c.read_cnt || 0).replace(/,/g, ''), 10) || 0,
            url: `https://vod.sooplive.co.kr/player/${id}/catch` // 🚨 숲(SOOP) 캐치 전용 플레이어 주소 적용!
        });
    }

    // 🏆 두 탭의 영상들을 합쳐서 조회수(views) 기준으로 1~3등 줄세우기!
    const hotClips = allShorts
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
