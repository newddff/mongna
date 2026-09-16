import { NextResponse } from 'next/server';

// 🌟 핵심 1: Vercel의 징글징글한 캐시 강제 폭파! (무조건 매번 최신 데이터 가져옴)
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    
    // 🌟 핵심 2: 숲 서버가 제일 좋아하는 가장 안전하고 기본이 되는 URL로 변경 
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      cache: 'no-store' // 여기서도 캐시 한 번 더 원천 차단!
    });
    
    // 만약 숲 서버가 응답을 안 주면 안전하게 텅 빈 박스(안내 문구)를 띄우도록 처리
    if (!res.ok) {
       return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    
    // 데이터가 어떤 껍데기에 싸여오든 무조건 배열(리스트)을 찾아내는 만능 탐지기
    let rawClips = [];
    if (Array.isArray(data)) rawClips = data;
    else if (Array.isArray(data?.data)) rawClips = data.data;
    else if (Array.isArray(data?.data?.list)) rawClips = data.data.list;
    else if (Array.isArray(data?.list)) rawClips = data.list;

    const hotClips = rawClips
      .map((item: any) => {
        const clip = item.vod || item.clip || item.catch || item;
        
        // 조회수 숫자로 깔끔하게 변환 (에러 방지)
        const viewsRaw = clip.read_cnt || clip.view_cnt || clip.views || 0;
        const viewsNum = typeof viewsRaw === 'string' ? parseInt(viewsRaw.replace(/,/g, ''), 10) : Number(viewsRaw) || 0;

        // 썸네일 이미지 링크 복구
        let thumbUrl = clip.thumb || clip.thumbnail || clip.poster || '';
        if (thumbUrl.startsWith('//')) {
          thumbUrl = 'https:' + thumbUrl;
        }

        // 🚨 [필살기] 만약 숲 서버에서 주는 데이터 이름이 바뀌었다면, 그 이름들을 화면에 띄워서 추적함!
        const fallbackTitle = clip.title || clip.vod_title || clip.name || clip.subject;
        const debugKeys = fallbackTitle ? fallbackTitle : `🚨오류분석: ${Object.keys(clip).join(', ')}`;

        return {
          id: clip.title_no || clip.vod_no || clip.bbs_no || 'unknown',
          title: debugKeys,
          thumb: thumbUrl || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: viewsNum, 
          url: `https://vod.sooplive.co.kr/player/${clip.title_no || clip.vod_no || clip.bbs_no}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 조회수 순위 나열
      .slice(0, 3); // 깔끔하게 1,2,3등만 자르기

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
