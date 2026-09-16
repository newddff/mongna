import { NextResponse } from 'next/server';

// 🌟 종우님 말씀대로 트래픽 요금 폭탄을 막기 위해 '1시간(3600초) 캐시' 철벽 방어 모드로 복구!
export const revalidate = 3600; 

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=all`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
       return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    const rawClips = Array.isArray(data?.data) ? data.data : [];

    const hotClips = rawClips
      .map((clip: any) => {
        // 💡 1. 디버그로 알아낸 숲(SOOP)의 진짜 제목 이름표 적용! (title_name)
        const title = clip.title_name || clip.title || '제목을 불러올 수 없습니다';
        
        // 💡 2. 조회수에 쉼표(,)가 섞여 있어도 강제로 다 빼버리고 순수 숫자로 계산!
        const rawViews = clip.read_cnt || 0;
        const views = parseInt(String(rawViews).replace(/,/g, ''), 10) || 0;

        // 💡 3. 썸네일 이미지 링크 복구 (//stimg... 앞에 https: 강제 결합)
        let thumb = clip.thumb || '';
        if (thumb.startsWith('//')) {
          thumb = 'https:' + thumb;
        }

        return {
          id: clip.title_no,
          title: title,
          thumb: thumb,
          views: views, 
          url: `https://vod.sooplive.co.kr/player/${clip.title_no}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 조회수 순위대로 나열
      .slice(0, 3); // 깔끔하게 1,2,3등만 자르기

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
