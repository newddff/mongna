// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판

  try {
    let allArticles: any[] = [];
    
    // 💡 VOD 플레이어에서 성공했던 검증된 2중 프록시(우회) 로직 적용
    const proxies = [
      (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    for (const menuId of MENU_IDS) {
      const targetUrl = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      let data = null;
      let lastError = "";

      // 첫 번째 프록시가 실패하면 두 번째 프록시로 자동 재시도
      for (const getProxyUrl of proxies) {
        try {
          const response = await fetch(getProxyUrl(targetUrl), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://m.cafe.naver.com/',
              'Origin': 'https://m.cafe.naver.com'
            },
            cache: 'no-store'
          });

          if (response.ok) {
            data = await response.json();
            break; // 성공하면 반복문 탈출!
          } else {
            lastError = `Status: ${response.status}`;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!data) {
        throw new Error(`모든 프록시 서버 연결 실패. (${lastError})`);
      }
      
      // 네이버 데이터 정제
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
