// src/pages/api/cafe.ts (또는 pages/api/cafe.ts)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14'];

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      const url = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          // 💡 1. 봇 차단을 뚫기 위한 강력한 스마트폰 브라우저 위장
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          // 💡 2. "나 네이버 카페 메인 홈페이지에서 클릭해서 들어온 거야"라고 속이는 핵심 키
          'Referer': 'https://m.cafe.naver.com/', 
          'Origin': 'https://m.cafe.naver.com'
        }
      });

      // 💡 만약 네이버가 또 막는다면, 정확히 어떤 이유로 막았는지 잡아내기 위한 코드
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

    allArticles.sort((a, b) => b.timestamp - a.timestamp);
    return res.status(200).json({ success: true, data: allArticles });

  } catch (error: any) {
    console.error("카페 데이터 연동 에러:", error);
    // 💡 에러 발생 시 숨기지 않고 화면에 원인을 낱낱이 출력!
    return res.status(500).json({ 
      success: false, 
      error: '카페 데이터를 가져오지 못했습니다.',
      detail: error.message || String(error) // 무엇이 문제인지 디버깅용
    });
  }
}
