import { NextResponse } from 'next/server';

export const revalidate = 3600; 

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=all`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const data = await res.json();
    
    // 💡 숲 API가 가끔 이중 배열이나 다른 키값으로 줄 때를 대비한 튼튼한 로직
    const rawClips = Array.isArray(data?.data) ? data.data : (data?.data?.list || []);

    const hotClips = rawClips
      .map((item: any) => {
        // 항목이 중첩 객체일 경우 방어
        const clip = item.vod || item.clip || item.catch || item;
        
        // 💡 조회수 안전하게 숫자로 변환 ("1,234" 같은 문자열에서 쉼표 빼고 계산)
        const viewsRaw = clip.read_cnt || clip.view_cnt || clip.views || 0;
        const viewsNum = typeof viewsRaw === 'string' ? parseInt(viewsRaw.replace(/,/g, ''), 10) : Number(viewsRaw) || 0;

        // 💡 썸네일 URL에 https: 강제 추가 (//stimg... 에러 방어)
        let thumbUrl = clip.thumb || clip.thumbnail || clip.poster || '';
        if (thumbUrl.startsWith('//')) {
          thumbUrl = 'https:' + thumbUrl;
        }

        return {
          id: clip.title_no || clip.vod_no || clip.bbs_no || 'unknown',
          title: clip.title || clip.vod_title || clip.name || clip.subject || '제목 없는 영상',
          thumb: thumbUrl || 'https://via.placeholder.com/320x180?text=No+Image', // 썸네일 없으면 임시 이미지 띄움
          views: viewsNum, 
          url: `https://vod.sooplive.co.kr/player/${clip.title_no || clip.vod_no || clip.bbs_no}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 숫자로 안전하게 1~3등 내림차순 정렬
      .slice(0, 3); // 딱 3개만 자르기!

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
