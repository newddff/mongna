import { NextResponse } from 'next/server';

// 💡 현실적이고 최신 브라우저 환경을 반영한 User-Agent 풀
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    const searchQuery = encodeURIComponent(`${keyword} 방송국`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&hl=ko&gl=KR`;

    // 💡 요청마다 랜덤으로 User-Agent 순환 적용
    const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await fetch(googleSearchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': selectedUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Google fetch failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

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
    console.error('❌ User-Agent 순환 크롤링 에러:', error);
    
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
