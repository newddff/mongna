import { NextResponse } from 'next/server';

// 🌟 핵심: 3600초(1시간) 동안은 캐시된 데이터를 사용 (서버 부담 제로)
export const revalidate = 3600; 

export async function GET() {
  try {
    // 💡 몽나님의 진짜 숲 아이디
    const soopId = 'pinktape8'; 
    
    // 💡 type=all 로 변경 완료! (에러 났던 괄호 부분도 완벽하게 복구했습니다)
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=all`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const data = await res.json();
    const clips = data?.data || [];

    // 💡 가져온 영상 중 '조회수(read_cnt)'가 높은 순서대로 내림차순 정렬 후 3개만 자르기
    const hotClips = clips
      .sort((a: any, b: any) => (b.read_cnt || 0) - (a.read_cnt || 0))
      .slice(0, 3)
      .map((clip: any) => ({
        id: clip.title_no,
        title: clip.title,
        thumb: clip.thumb, // 썸네일 이미지
        views: clip.read_cnt || 0, // 조회수
        url: `https://vod.sooplive.co.kr/player/${clip.title_no}` // 클립 바로가기 링크
      }));

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
