import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  const API_KEY = '06df5786daca7d1ae249f206dea645f2';

  try {
    // 1. 숲(SOOP) 방송국을 정확히 타겟팅하도록 검색어 조합 개선
    const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(`${keyword} 숲 방송국`)}&hl=ko&gl=KR`;
    const scraperApiUrl = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(scraperApiUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    // 2. SOOP 방송국 URL 패턴 정밀 매칭 (소문자/대문자/숫자/_/- 허용)
    const regex = /sooplive\.com\/station\/([a-zA-Z0-9_-]+)/g;
    let match;
    const foundIds = new Set<string>();

    while ((match = regex.exec(htmlText)) !== null) {
      if (match[1]) {
        // 불필요한 시스템 키워드 제외 필터링
        const id = match[1];
        if (!['station', 'm', 'www', 'bbs'].includes(id.toLowerCase())) {
          foundIds.add(id);
        }
      }
    }

    const uniqueIds = Array.from(foundIds);
    
    // 검색 결과가 없으면 입력한 키워드를 영문 아이디로 간주하여 기본 생성
    const cleanKeywordId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const targetIds = uniqueIds.length > 0 ? uniqueIds : [cleanKeywordId.length > 0 ? cleanKeywordId : 'mongna'];

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
    
    const cleanKeywordId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const fallbackId = cleanKeywordId.length > 0 ? cleanKeywordId : 'mongna';
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
