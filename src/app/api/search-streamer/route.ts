import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  // 💡 발급받으신 ScraperAPI 키
  const API_KEY = '06df5786daca7d1ae249f206dea645f2';

  try {
    // 1. 구글에서 "닉네임 방송국" 검색하는 URL 생성
    const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(`${keyword} 방송국`)}&hl=ko&gl=KR`;

    // 2. ScraperAPI 게이트웨이를 통해 요청 (구글 봇 차단 및 프록시 자동 우회)
    const scraperApiUrl = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(scraperApiUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    // 3. 긁어온 HTML에서 sooplive.com/station/아이디 패턴 추출
    const regex = /sooplive\.com\/station\/([a-zA-Z0-9_]+)/g;
    let match;
    const foundIds = new Set<string>();

    while ((match = regex.exec(htmlText)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const uniqueIds = Array.from(foundIds);
    const targetIds = uniqueIds.length > 0 ? uniqueIds : [keyword.toLowerCase().replace(/[^a-z0-9_]/g, '')];

    const streamers = targetIds.map((userId) => {
      const idLower = userId.toLowerCase();
      const prefix = idLower.substring(0, 2);

      return {
        name: keyword,
        userId: userId,
        profileImg: `https://profile.img.afreecatv.com/LOGO/${prefix}/${idLower}/${idLower}.jpg`,
        broadcastUrl: `https://www.sooplive.com/station/${userId}`
      };
    });

    return NextResponse.json({ streamers });

  } catch (error) {
    console.error('❌ ScraperAPI 연동 에러:', error);
    
    // 에러 시 폴백 처리
    const fallbackId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const prefix = fallbackId.substring(0, 2);

    return NextResponse.json({ 
      streamers: [{
        name: keyword,
        userId: fallbackId,
        profileImg: `https://profile.img.afreecatv.com/LOGO/${prefix}/${fallbackId}/${fallbackId}.jpg`,
        broadcastUrl: `https://www.sooplive.com/station/${fallbackId}`
      }] 
    });
  }
}
