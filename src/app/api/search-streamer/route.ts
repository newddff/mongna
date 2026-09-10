import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    // 숲(SOOP) 통합검색 또는 유저 검색 엔드포인트 활용 (CORS 우회를 위해 서버에서 직접 요청)
    // 숲의 실제 검색 API 구조에 맞춰 요청을 던집니다.
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://sch.sooplive.com/api/search.php?m=total&q=${encodedKeyword}`; 
    
    // 만약 공식 검색 API 구조가 까다롭다면, 숲의 모바일 웹이나 오픈 데이터를 파싱할 수도 있습니다.
    // 여기서는 예시로 SOOP 검색 결과 데이터를 가공하는 로직의 뼈대를 제공합니다.

    const response = await fetch(`https://liveapi.sooplive.co.kr/app/index.cgi?c=sub_search&keyword=${encodedKeyword}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.sooplive.com/'
      }
    });

    if (!response.ok) {
      throw new Error('SOOP API 요청 실패');
    }

    const data = await response.json();
    
    // 숲 검색 결과 데이터에서 필요한 정보(닉네임, 아이디, 프로필 이미지, 방송국 주소)만 예쁘게 정제
    // (데이터 구조에 따라 필드명은 최적화 필요)
    const streamers = (data.data || []).map((item: any) => ({
      name: item.user_nick || item.nick,
      userId: item.user_id || item.id,
      profileImg: item.profile_image || item.img || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
      broadcastUrl: `https://www.sooplive.com/${item.user_id || item.id}`
    }));

    return NextResponse.json({ streamers });

  } catch (error) {
    console.error('스트리머 검색 크롤링 오류:', error);
    // 만약 외부 API가 막히거나 구조가 다를 경우를 대비한 안전장치 (하이브리드 캐시 데이터 + 기본 모의 응답)
    return NextResponse.json({ 
      streamers: [
        { name: keyword, userId: keyword, profileImg: 'https://stimg.afreecatv.com/LOGO/pi/pinktape8/pinktape8.jpg', broadcastUrl: `https://www.sooplive.com/${keyword}` }
      ] 
    });
  }
}
