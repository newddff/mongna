// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

// 💡 핵심: Vercel 서버의 위치를 강제로 한국(서울) 데이터센터로 지정하여 네이버의 해외 IP 차단을 우회합니다.
export const preferredRegion = 'icn1';
export const dynamic = 'force-dynamic';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      const targetUrl = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      // 우회 프록시 없이 다이렉트로 네이버 본진 요청 (서버가 한국에 있으므로 무사통과)
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Referer': 'https://m.cafe.naver.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Naver API Error: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data?.message?.result?.articleList) {
        const articles = data.message.result.articleList.map((item: any) => ({
          articleId: item.articleId,
          title: item.subject,
          writer: item.writerNickname,
          timestamp: item.writeDateTimestamp,
          category: item.menuName, 
          url: `https://cafe.naver.com/ArticleRead.nhn?clubid=${CLUB_ID}&articleid=${item.articleId}`
        }));
        
        allArticles = [...allArticles, ...articles];
      }
    }

    // 최신순 정렬
    allArticles.sort((a, b) => b.timestamp - a.timestamp);
    
    // 성공 시 데이터 반환
    return NextResponse.json({ success: true, data: allArticles });

  } catch (error: any) {
    console.error("카페 데이터 연동 에러:", error);
    return NextResponse.json({ 
      success: false, 
      error: '카페 데이터를 가져오지 못했습니다.',
      detail: error.message || String(error)
    }, { status: 500 });
  }
}
