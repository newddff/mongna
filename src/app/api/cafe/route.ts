// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판

  // 💡 종우님 전용 구글 프록시 무적 주소 장착 완료!
  const GOOGLE_PROXY_URL = 'https://script.google.com/macros/s/AKfycbzy0tN8u9h6g7LMS9KEeRDsX8pHuqYQ5S88cISb9lUPTIHvTNV3e7q9Oc8vrdTXdZLr/exec';

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      const targetUrl = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      const response = await fetch(`${GOOGLE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`, { 
        cache: 'no-store' 
      });

      if (!response.ok) {
        throw new Error(`Google Proxy Error: ${response.status}`);
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

    allArticles.sort((a, b) => b.timestamp - a.timestamp);
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
