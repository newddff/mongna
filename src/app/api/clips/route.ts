import { NextResponse } from 'next/server';

// 🌟 다시 안전하게 1시간(3600초) 캐시 모드로 복구합니다! 
export const revalidate = 3600; 

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    
    // 💡 핵심 1: type=all 대신 type=catch 로 변경! (숲의 최신 숏폼 클립만 가져옵니다)
    // 팁: 만약 팬들이 딴 '유저클립'을 원하시면 catch 대신 user_clip 이라고 적으시면 됩니다!
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) return NextResponse.json({ clips: [] });
    
    const data = await res.json();
    const rawClips = Array.isArray(data?.data) ? data.data : (data?.data?.list || []);

    const hotClips = rawClips
      .map((clip: any) => {
        // 제목 깔끔하게 추출
        const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        
        // 💡 프로필 사진을 잡아오던 오류 수정! 딱 영상 썸네일 이름표만 지정해서 가져옵니다.
        let thumb = clip.thumb || clip.thumb_path || clip.catch_thumb || clip.uc_thumb || '';
        if (thumb.startsWith('//')) {
          thumb = 'https:' + thumb;
        } else if (thumb && !thumb.startsWith('http')) {
          thumb = 'https://' + thumb.replace(/^\/+/, ''); 
        }

        // 조회수 숫자만 깔끔하게 추출
        const rawViews = clip.view_cnt || clip.read_cnt || 0;
        const views = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10) || 0;

        // 캐치/유저클립의 고유 ID 추출
        const videoId = clip.title_no || clip.catch_no || clip.uc_no || clip.bbs_no;

        return {
          id: videoId || Math.random().toString(),
          title: title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: views, 
          url: `https://vod.sooplive.co.kr/player/${videoId}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 조회수 순위 나열
      .slice(0, 3); // 1~3등 자르기

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
