import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    
    // 💡 SOOP 모바일 홈페이지에서 몽나님 방송 정보를 몰래 훔쳐옵니다 (API 키 필요 없음!)
    const res = await fetch('https://m.sooplive.co.kr/pinktape8', { headers, cache: 'no-store' });
    
    if (!res.ok) throw new Error("통신 실패");
    
    const html = await res.text();
    const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);
    
    if (match && match[1]) {
        const state = JSON.parse(match[1]);
        const broad = state?.station?.broad || null;
        
        // 방송 중일 때만 데이터 전달
        if (broad && broad.is_live) {
            return NextResponse.json({
                broad: [{
                    user_id: 'pinktape8',
                    broad_thumb: broad.broad_thumb || '',
                    broad_title: broad.broad_title || ''
                }]
            });
        }
    }
    
    // 방송 중이 아니면 빈 배열 전달
    return NextResponse.json({ broad: [] });
    
  } catch (error) {
    return NextResponse.json({ broad: [] });
  }
}
