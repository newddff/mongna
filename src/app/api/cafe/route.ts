// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      // 💡 1. 네이버가 Vercel IP를 차단하지 못하도록 '우회 서버(allorigins)'를 징검다리로 씁니다.
      const targetUrl = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Proxy API Error: ${response.status}`);
      }

      const proxyData = await response.json();
      
      // 💡 2. 우회 서버가 가져온 텍스트(contents)를 다시 JSON 객체로 변환
      if (!proxyData.contents) continue;
      const data = JSON.parse(proxyData.contents);
      
      if (data?.message?.result?.articleList) {
        const articles = data.message.result.articleList.map((item: any) => ({
          articleId: item.articleId,
          title: item.subject,
          writer: item.writerNickname,
          // 네이버에서 주는 시간값을 그대로 킵
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
