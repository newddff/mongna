import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    // 구글 검색 쿼리: "닉네임 방송국"
    const searchQuery = encodeURIComponent(`${keyword} 방송국`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&hl=ko&gl=KR`;

    // 💡 실제 최신 크롬 브라우저가 전송하는 헤더 세트를 완벽히 모방
    const response = await fetch(googleSearchUrl, {
      method: 'GET',
      headers: {
        'Host': 'www.google.com',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Google fetch failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    // 구글 검색 결과 HTML에서 sooplive.com/station/아이디 패턴 추출
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
    console.error('❌ 크롬 위장 헤더 크롤링 에러:', error);
    
    const fallbackId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const prefix = fallbackId.substring(0, 2);

    return NextResponse.json({ 
      streamers: [{
        name: keyword,
        userId: fallbackId,
        profileImg: `https://profile.img.afreescatv.com/LOGO/${prefix}/${fallbackId}/${fallbackId}.jpg`,
        broadcastUrl: `https://www.sooplive.com/station/${fallbackId}`
      }] 
    });
  }
}
