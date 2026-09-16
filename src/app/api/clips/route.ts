import { NextResponse } from 'next/server';

// 🌟 Vercel의 지독한 캐시를 영구적으로 박살 냅니다! (무조건 최신 실시간 데이터만 가져옴)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json'
    };

    // 💡 핵심 1: '다시보기(all)'를 빼고, '캐치(catch)'와 '클립(user_clip)'만 동시에 긁어옵니다!
    const [catchRes, clipRes] = await Promise.all([
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch`, { headers, cache: 'no-store' }),
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=user_clip`, { headers, cache: 'no-store' })
    ]);
    
    const catchData = await (catchRes.ok ? catchRes.json() : Promise.resolve({ data: [] }));
    const clipData = await (clipRes.ok ? clipRes.json() : Promise.resolve({ data: [] }));

    const rawCatches = Array.isArray(catchData?.data) ? catchData.data : (catchData?.data?.list || []);
    const rawClips = Array.isArray(clipData?.data) ? clipData.data : (clipData?.data?.list || []);

    // 💡 두 개의 숏폼 데이터를 하나로 합칩니다!
    const allShorts = [...rawCatches, ...rawClips];

    const hotClips = allShorts
      .map((clip: any) => {
        // 제목 추출 (캐치와 클립의 이름표 모두 대응)
        const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        
        // 💡 핵심 2: 조회수 오류 완벽 해결 (캐치는 view_cnt, 클립은 read_cnt에 들어있음)
        const rawViews = clip.view_cnt || clip.read_cnt || clip.total_view_cnt || 0;
        const views = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10) || 0;

        // 💡 핵심 3: 썸네일 오류 완벽 해결 (캐치는 thumb_path, 클립은 uc_thumb에 들어있음)
        let thumb = clip.thumb_path || clip.uc_thumb || clip.thumb || clip.thumbnail || '';
        if (thumb.startsWith('//')) {
          thumb = 'https:' + thumb;
        } else if (thumb && !thumb.startsWith('http')) {
          thumb = 'https://' + thumb.replace(/^\/+/, ''); 
        }

        // 고유 링크(URL) 조립 (클립은 bbs_no, 캐치는 catch_no를 사용)
        const videoId = clip.bbs_no || clip.uc_no || clip.catch_no || clip.title_no;

        return {
          id: videoId || Math.random().toString(),
          title: title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: views, 
          url: `https://vod.sooplive.co.kr/player/${videoId}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 캐치+클립 통합 조회수 1~3등 줄세우기!
      .slice(0, 3); 

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
