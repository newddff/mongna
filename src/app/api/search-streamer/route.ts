import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    const encodedKeyword = encodeURIComponent(keyword);
    
    // 숲(SOOP) 검색 API 호출 (헤더를 실제 브라우저처럼 정교하게 세팅)
    const searchUrl = `https://sch.sooplive.com/api/search.php?m=total&q=${encodedKeyword}`;
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.sooplive.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`SOOP API HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 숲 검색 결과 구조에 맞춘 데이터 파싱 (데이터가 배열 형태일 때 안전하게 추출)
    const rawList = data.data || data.list || data.result || [];
    
    const streamers = rawList.map((item: any) => {
      const userId = item.user_id || item.id || item.nick_id || '';
      const nick = item.user_nick || item.nick || keyword;
      const idLower = userId.toLowerCase();
      const prefix = idLower.substring(0, 2);

      return {
        name: nick,
        userId: userId,
        profileImg: item.profile_image || `https://profile.img.afreecatv.com/LOGO/${prefix}/${idLower}/${idLower}.jpg`,
        broadcastUrl: `https://www.sooplive.com/${userId}`
      };
    }).filter((s: any) => s.userId !== ''); // 아이디가 빈 값인 경우 제외

    return NextResponse.json({ streamers });

  } catch (error) {
    console.error('❌ 숲(SOOP) 실시간 크롤링 API 에러:', error);
    
    // 크롤링 실패 시에도 에러로 뻗지 않고 빈 배열을 반환하여 웹사이트가 먹통이 되는 것 방지
    return NextResponse.json({ streamers: [], error: 'Crawling failed' }, { status: 200 });
  }
}
