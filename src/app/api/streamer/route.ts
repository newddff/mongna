import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const streamerId = searchParams.get('id');

  if (!streamerId) {
    return NextResponse.json({ error: 'Streamer ID is required' }, { status: 400 });
  }

  try {
    // 숲(SOOP) 방송국/채널 정보를 서버 대 서버로 안전하게 호출 (CORS 우회)
    const response = await fetch(`https://chapi.sooplive.com/api/${streamerId}/station`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    // 만약 API 응답이 원활하지 않을 경우를 대비한 안전한 Fallback (기본 프로필 규칙 조합)
    const fallbackProfileImg = `https://profile.img.sooplive.co.kr/LOGO/${streamerId.charAt(0)}/${streamerId}/${streamerId}.jpg`;
    
    if (!response.ok) {
      return NextResponse.json({
        streamerId,
        nickname: streamerId,
        profileImg: fallbackProfileImg,
        stationUrl: `https://www.sooplive.com/station/${streamerId}`,
        isLive: false,
      });
    }

    const data = await response.json();
    const stationInfo = data.data || data;
    
    const nickname = stationInfo.user_nick || stationInfo.nickname || streamerId;
    const profileImg = stationInfo.profile_image || fallbackProfileImg;

    return NextResponse.json({
      streamerId,
      nickname,
      profileImg,
      stationUrl: `https://www.sooplive.com/station/${streamerId}`,
    });

  } catch (error) {
    console.error('SOOP Proxy Crawling Error:', error);
    return NextResponse.json({ error: 'Failed to fetch streamer data' }, { status: 500 });
  }
}
