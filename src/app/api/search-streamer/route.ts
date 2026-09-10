import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    // 구글에 "닉네임 숲" 또는 "닉네임 sooplive"로 검색하여 공식 방송국 주소를 유추
    const searchQuery = encodeURIComponent(`${keyword} 숲`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&hl=ko`;

    const response = await fetch(googleSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error('Google search request failed');
    }

    const htmlText = await response.text();

    // 정규식을 이용해 구글 검색 결과 HTML에서 sooplive.com 링크들을 모두 추출
    // 예: https://www.sooplive.com/station/choiagain 또는 https://st.sooplive.com/... 등
    const regex = /https?:\/\/(?:www\.)?sooplive\.com\/(?:station\/)?([a-zA-Z0-9_]+)/g;
    let match;
    const foundIds = new Set<string>();

    while ((match = regex.exec(htmlText)) !== null) {
      const extractedId = match[1];
      // 제외할 키워드 필터링 (station, app, main 등 시스템 주소 제외)
      if (extractedId && !['station', 'app', 'main', 'board', 'notice'].includes(extractedId.toLowerCase())) {
        foundIds.add(extractedId);
      }
    }

    const uniqueIds = Array.from(foundIds);

    // 만약 구글 검색에서 링크를 찾지 못했을 경우를 대비한 기본 폴백(입력한 닉네임을 ID로 간주)
    if (uniqueIds.length === 0) {
      const fallbackId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (fallbackId) uniqueIds.push(fallbackId);
    }

    // 추출된 영문 ID들을 바탕으로 숲 프로필 및 방송국 정보 객체 생성
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
    console.error('❌ 구글 기반 숲 크롤링 API 에러:', error);
    
    // 에러 발생 시 입력한 닉네임 기반으로 기본 구조 반환 (앱 다운 방지)
    const defaultId = keyword.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const defaultPrefix = defaultId.substring(0, 2);

    return NextResponse.json({ 
      streamers: [{
        name: keyword,
        userId: defaultId,
        profileImg: `https://profile.img.afreecatv.com/LOGO/${defaultPrefix}/${defaultId}/${defaultId}.jpg`,
        broadcastUrl: `https://www.sooplive.com/station/${defaultId}`
      }] 
    });
  }
}
