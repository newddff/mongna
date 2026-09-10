import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  const API_KEY = '06df5786daca7d1ae249f206dea645f2';

  try {
    // 💡 튜닝 포인트: site:sooplive.com/station 검색어를 조합해 무조건 방송국 홈페이지만 긁어오도록 강제 타겟팅
    const cleanQuery = keyword.replace(/_/g, ' ').trim();
    const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanQuery} site:sooplive.com/station`)}&hl=ko&gl=KR`;
    const scraperApiUrl = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(scraperApiUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    // SOOP 방송국 URL 패턴 정밀 매칭 (소문자, 대문자, 숫자, 언더바, 하이픈 허용)
    const regex = /sooplive\.com\/station\/([a-zA-Z0-9_-]+)/g;
    let match;
    const foundIds = new Set<string>();

    while ((match = regex.exec(htmlText)) !== null) {
      if (match[1]) {
        const id = match[1];
        // 불필요한 시스템 키워드 제외 필터링
        if (!['station', 'm', 'www', 'bbs'].includes(id.toLowerCase())) {
          foundIds.add(id);
        }
      }
    }

    const uniqueIds = Array.from(foundIds);
    
    // 검색 결과가 없으면 입력한 키워드에서 특수문자를 제외한 형태를 기본 아이디로 생성
    const cleanKeywordId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const targetIds = uniqueIds.length > 0 ? uniqueIds : [cleanKeywordId.length > 0 ? cleanKeywordId : 'mongna'];

    const streamers = targetIds.map((userId) => {
      const idLower = userId.toLowerCase();
      const prefix = idLower.substring(0, 2);

      return {
        name: keyword, // 원본 검색어(예: 달묘_)를 닉네임으로 유지
        userId: userId,
        profileImg: `https://profile.img.afreecatv.com/LOGO/${prefix}/${idLower}/${idLower}.jpg`,
        broadcastUrl: `https://www.sooplive.com/station/${userId}`
      };
    });

    return NextResponse.json({ streamers });

  } catch (error) {
    console.error('❌ ScraperAPI 연동 에러:', error);
    
    // API 에러 시 폴백(기본값) 안전 처리
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
