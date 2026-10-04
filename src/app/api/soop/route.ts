import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    
    const res = await fetch('https://m.sooplive.co.kr/pinktape8', { headers, cache: 'no-store' });
    if (!res.ok) throw new Error("통신 실패");
    
    const html = await res.text();
    const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);
    
    if (match && match[1]) {
        const state = JSON.parse(match[1]);
        const broad = state?.station?.broad || null;
        
        if (broad && broad.is_live) {
            return NextResponse.json({
                broad: [{
                    user_id: 'pinktape8',
                    broad_thumb: broad.broad_thumb || '',
                    broad_title: broad.broad_title || '',
                    // 💡 여기서부터 새로 추가된 꿀 데이터들!
                    viewers: broad.current_sum_viewer || 0,        // 현재 시청자 수
                    category: broad.broad_cate_name || '카테고리 없음', // 방송 카테고리 (예: 소통, 종합게임)
                    start_time: broad.broad_start || '',           // 방송 킨 시간
                    resolution: broad.resolution || ''             // 방송 화질
                }]
            });
        }
    }
    
    return NextResponse.json({ broad: [] });
    
  } catch (error) {
    return NextResponse.json({ broad: [] });
  }
}
