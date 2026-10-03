import { NextResponse } from 'next/server';

// 💡 Vercel 서버가 옛날 데이터를 기억(캐싱)하지 못하게 강제 설정 (생방송 레이더 필수 옵션)
export const dynamic = 'force-dynamic';

export async function GET() {
  const CLIENT_ID = process.env.SOOP_CLIENT_ID;

  // 🚨 Vercel 환경 변수에 키가 없으면 500 에러를 뱉습니다. (아까 보신 에러의 원인!)
  if (!CLIENT_ID) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    // 💡 몽나님(pinktape8) 방송 상태만 정확하고 빠르게 긁어오도록 검색 옵션 추가
    const targetUrl = `https://openapi.sooplive.co.kr/api/broad/list?client_id=${CLIENT_ID}&select_key=user_id&select_value=pinktape8`;
    
    const response = await fetch(targetUrl, { 
        cache: 'no-store' // 항상 최신 상태 통신
    });
    
    if (!response.ok) {
        throw new Error("SOOP 서버 통신 실패");
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("방송 상태 확인 실패:", error);
    return NextResponse.json({ error: "데이터 통신 실패", broad: [] }, { status: 500 });
  }
}
