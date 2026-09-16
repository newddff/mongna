import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
    
    const allShorts: any[] = [];

    // 💡 1. 종우님이 알려주신 '유저클립' 해결: 클립 전용 API 타입(user_clip)으로 명확하게 찌르기!
    try {
        const clipApi = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=user_clip`, { headers, cache: 'no-store' });
        const clipData = await clipApi.json();
        const clips = Array.isArray(clipData?.data) ? clipData.data : (clipData?.data?.list || []);
        allShorts.push(...clips);
    } catch(e) {}

    // 💡 2. 종우님이 알려주신 '캐치' 해결: 웹 스크래핑(HTML 파싱)으로 웹페이지 데이터 통째로 뜯어오기!
    try {
        const catchHtmlRes = await fetch(`https://www.sooplive.com/station/${soopId}/catch`, { headers, cache: 'no-store' });
        const catchHtml = await catchHtmlRes.text();
        
        // 숲(SOOP) 웹페이지 깊숙이 숨겨진 JSON 데이터를 강제로 뜯어내는 정규식
        const nextDataMatch = catchHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
            const nextData = JSON.parse(nextDataMatch[1]);
            
            // 데이터 더미 속에서 'catch_no(캐치 고유번호)'가 있는 진짜 영상만 쏙쏙 찾아내는 탐지기
            const findCatches = (obj: any) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj.catch_no && obj.title) {
                    allShorts.push(obj);
                } else {
                    Object.values(obj).forEach(val => findCatches(val));
                }
            };
            findCatches(nextData);
        }
    } catch(e) {}

    // 💡 3. 캐치와 클립을 하나로 합쳐서 완벽하게 정렬!
    const hotClips = allShorts
      .map((clip: any) => {
        const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        
        const rawViews = clip.view_cnt || clip.read_cnt || clip.total_view_cnt || 0;
        const views = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10) || 0;

        let thumb = clip.thumb_path || clip.uc_thumb || clip.thumb || clip.thumbnail || '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');
        
        const videoId = clip.catch_no || clip.uc_no || clip.bbs_no || clip.title_no;

        return {
          id: videoId || Math.random().toString(),
          title: title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: views, 
          // 캐치와 클립의 고유 주소 연결 (캐치 전용 주소 완벽 대응)
          url: clip.catch_no 
                ? `https://www.sooplive.com/catch/${soopId}/${videoId}`
                : `https://vod.sooplive.co.kr/player/${videoId}` 
        };
      })
      .filter((clip: any) => clip.title !== '제목 없음' && clip.id) // 찌꺼기 제거
      .filter((clip: any, index: number, self: any[]) => index === self.findIndex((t) => t.id === clip.id)) // 중복 방지
      .sort((a: any, b: any) => b.views - a.views) // 조회수 순으로 나열
      .slice(0, 3); 

    // 브라우저 캐시 원천 차단 방어막
    return NextResponse.json({ clips: hotClips }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (error) {
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
