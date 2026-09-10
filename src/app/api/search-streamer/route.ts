import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  const API_KEY = '06df5786daca7d1ae249f206dea645f2';

  try {
    // 💡 자연스러운 검색어 조합으로 원복 (질문자님이 스크린샷에서 증명하신 방법!)
    const cleanQuery = keyword.replace(/_/g, ' ').trim();
    const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanQuery} 숲 방송국`)}&hl=ko&gl=KR`;
    const scraperApiUrl = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(scraperApiUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    const foundIds = new Set<string>();

    // 💡 강화 1: SOOP 주소뿐만 아니라, 구글 내부 HTML에 남아있는 옛날 아프리카TV 주소(bj.afreecatv.com)까지 완벽 매칭!
    const urlRegex = /(?:sooplive\.com\/station\/|bj\.afreecatv\.com\/)([a-zA-Z0-9_-]+)/gi;
    let match;
    while ((match = urlRegex.exec(htmlText)) !== null) {
      if (match[1]) {
        const id = match[1];
        if (!['station', 'm', 'www', 'bbs'].includes(id.toLowerCase())) {
          foundIds.add(id);
        }
      }
    }

    // 💡 강화 2: 스크린샷에 나온 텍스트 형태 (sooplive.com › station › deliouswe) 자체를 잡아내는 정규식!
    const breadcrumbRegex = /sooplive\.com.*?(?:›|&rsaquo;|&#8250;).*?station.*?(?:›|&rsaquo;|&#8250;).*?([a-zA-Z0-9_-]+)/gi;
    while ((match = breadcrumbRegex.exec(htmlText)) !== null) {
      if (match[1]) {
        const id = match[1];
        if (!['station', 'm', 'www', 'bbs'].includes(id.toLowerCase())) {
          foundIds.add(id);
        }
      }
    }

    const uniqueIds = Array.from(foundIds);
    
    // 검색 결과가 아예 없으면 가짜 데이터 만들지 않고 빈 배열 리턴
    if (uniqueIds.length === 0) {
      return NextResponse.json({ streamers: [] });
    }

    // 구글에서 긁어온 실제 ID들을 반환
    const streamers = uniqueIds.map((userId) => {
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
    return NextResponse.json({ streamers: [] });
  }
}
