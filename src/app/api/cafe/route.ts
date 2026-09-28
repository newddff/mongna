// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      const url = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://m.cafe.naver.com/', 
          'Origin': 'https://m.cafe.naver.com'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Naver API Error: ${response.status} ${response.statusText}`);
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
    
    // 성공 시 글 목록 데이터 반환
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
