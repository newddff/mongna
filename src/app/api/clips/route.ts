import { NextResponse } from 'next/server';

// 🌟 빠른 확인을 위해 캐시 방어막을 0초로 엽니다! (성공 확인 후 나중에 3600으로 돌리면 됩니다)
export const revalidate = 0; 

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=all`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      cache: 'no-store' // 확실한 디버깅을 위해 fetch 캐시도 원천 차단!
    });
    
    if (!res.ok) {
       return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    const rawClips = Array.isArray(data?.data) ? data.data : [];

    const hotClips = rawClips
      .map((clip: any) => {
        // ✅ 1. 제목 (완벽하게 작동 중!)
        const title = clip.title_name || clip.title || '제목 없음';
        
        // ✅ 2. 숲(SOOP) 조회수 키값 총동원! (문자열에 섞인 한글이나 쉼표도 다 털어내고 숫자만 추출)
        const rawViews = clip.view_cnt || clip.read_cnt || clip.total_view_cnt || clip.watch_cnt || 0;
        const views = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10) || 0;

        // ✅ 3. 숲(SOOP) 썸네일 키값 총동원! (경로가 이상하게 오면 강제로 https:// 조립)
        let thumb = clip.thumb_path || clip.thumb || clip.thumbnail || clip.uc_thumb || clip.file_path || '';
        if (thumb.startsWith('//')) {
          thumb = 'https:' + thumb;
        } else if (thumb && !thumb.startsWith('http')) {
          thumb = 'https://' + thumb.replace(/^\/+/, ''); // 맨 앞 슬래시 지우고 https 붙임
        }

        return {
          id: clip.title_no || clip.vod_no || 'unknown',
          title: title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: views, 
          url: `https://vod.sooplive.co.kr/player/${clip.title_no || clip.vod_no}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 진짜 숫자로 내림차순 정렬
      .slice(0, 3); 

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
