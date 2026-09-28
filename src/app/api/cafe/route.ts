// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const CLUB_ID = '31747136';
  const MENU_IDS = ['13', '14']; 

  const GOOGLE_PROXY_URL = 'https://script.google.com/macros/s/AKfycbzy0tN8u9h6g7LMS9KEeRDsX8pHuqYQ5S88cISb9lUPTIHvTNV3e7q9Oc8vrdTXdZLr/exec';

  try {
    let allArticles: any[] = [];

    for (const menuId of MENU_IDS) {
      const targetUrl = `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CLUB_ID}&search.menuid=${menuId}&search.page=1&search.perPage=20`;
      
      const response = await fetch(`${GOOGLE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`, { 
        cache: 'no-store' 
      });

      // 💡 바로 JSON으로 바꾸지 않고, 도대체 어떤 텍스트(HTML)가 왔는지 먼저 받아봅니다.
      const textData = await response.text();

      // 만약 받아온 데이터가 정상적인 JSON('{', '[') 형태가 아니라면? 
      if (!textData.trim().startsWith('{') && !textData.trim().startsWith('[')) {
        // 에러를 발생시키면서, 서버가 던져준 HTML 웹페이지의 첫 300글자를 화면에 그대로 출력합니다!
        throw new Error(`서버가 데이터를 주지 않고 웹페이지를 반환했습니다. 원인 텍스트: ${textData.substring(0, 300)}`);
      }

      // 정상적인 경우에만 JSON으로 변환
      const data = JSON.parse(textData);
      
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
