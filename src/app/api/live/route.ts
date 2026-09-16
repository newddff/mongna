import { NextResponse } from 'next/server';

// 🌟 핵심: 60초 동안은 숲 서버를 찌르지 않고 저장된 정답만 보여줌 (과부하 완벽 방지)
export const revalidate = 60; 

export async function GET() {
  try {
    // 💡 여기에 몽나님의 진짜 숲(SOOP) 영문 아이디를 적어주세요! (예: 'mongna123')
    const soopId = 'pinktape8'; 
    
    // 숲(구 아프리카) 방송국 정보 가져오기
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/station`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    const data = await res.json();

    // broad_no(방송 번호)가 존재하면 생방송 중인 것으로 판단
    const isLive = !!data?.broad?.broad_no; 

    return NextResponse.json({ isLive });
  } catch (error) {
    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
