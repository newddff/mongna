import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    // 구글 검색 쿼리: "닉네임 숲"
    const searchQuery = encodeURIComponent(`${keyword} 숲`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&hl=ko&gl=KR`;

    // 실제 브라우저처럼 보이게 헤더를 정교하게 설정
    const response = await fetch(googleSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Google fetch failed with status: ${response.status}`);
    }

    const htmlText = await response.text();

    // 💡 구글 검색 결과에 나오는 sooplive.com/station/아이디 패턴을 정확하게 캐치하는 정규식
    const regex = /sooplive\.com\/station\/([a-zA-Z0-9_]+)/g;
    let match;
    const foundIds = new Set<string>();

    while ((match = regex.exec(htmlText)) !== null) {
      if (match[1]) {
        foundIds.add(match[1]);
      }
    }

    const uniqueIds = Array.from(foundIds);

    // 만약 구글 파싱 결과가 없다면 입력한 닉네임을 영문 ID로 변환하여 기본값 생성
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
    console.error('❌ 구글 검색 파싱 에러:', error);
    
    // 에러 발생 시 기본 구조 반환
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
