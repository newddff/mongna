// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // 몽나님 카페 고유 ID 및 게시판 ID
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; // 13번, 14번 게시판 동시에 가져오기

  try {
    let allArticles: any[] = [];

    // 각 게시판별로 네이버 비밀 API 찔러보기
    for (const menuId of MENU_IDS) {
      const url = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // 봇 차단 방지용 위장
        },
        // Next.js 캐시 방지 (항상 최신 글을 가져오도록 설정)
        cache: 'no-store' 
      });

      const data = await response.json();
      
      // 네이버가 응답을 제대로 줬다면 데이터 정제하기
      if (data?.message?.result?.articleList) {
        const articles = data.message.result.articleList.map((item: any) => ({
          articleId: item.articleId,
          title: item.subject,
          writer: item.writerNickname,
          // 네이버는 timestamp(숫자)로 시간을 주므로 그대로 저장
          timestamp: item.writeDateTimestamp,
          // 카테고리 (필터링 탭에 쓰일 이름)
          category: item.menuName, 
          // 클릭 시 이동할 네이버 카페 본문 링크
          url: `https://cafe.naver.com/ArticleRead.nhn?clubid=${CLUB_ID}&articleid=${item.articleId}`
        }));
        
        allArticles = [...allArticles, ...articles];
      }
    }

    // 두 게시판의 글을 합친 뒤, '최신순(시간 역순)'으로 정렬
    allArticles.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ success: true, data: allArticles });

  } catch (error) {
    console.error("카페 데이터 연동 에러:", error);
    return NextResponse.json(
      { success: false, error: '카페 데이터를 가져오지 못했습니다.' }, 
      { status: 500 }
    );
  }
}
