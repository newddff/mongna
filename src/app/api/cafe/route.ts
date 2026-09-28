// src/app/api/cafe/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // 💡 종우님 카페(f-e)의 공식 RSS 주소 (우회 서버 필요 없음!)
  const RSS_URL = 'https://cafe.rss.naver.com/f-e';

  try {
    // 네이버가 봇 차단을 하지 않는 공식 채널이므로 다이렉트 접속
    const response = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`RSS 연결 실패: HTTP ${response.status}`);
    }

    const xmlData = await response.text();
    let allArticles: any[] = [];

    // 정규식 도우미 함수: XML 태그 안의 텍스트와 특수기호(CDATA)를 깔끔하게 발라냅니다.
    const extractTag = (xml: string, tag: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const match = xml.match(regex);
      return match ? match[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
    };

    // <item> (게시글) 단위로 쪼개기
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlData)) !== null) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const author = extractTag(itemXml, 'author');
      const pubDate = extractTag(itemXml, 'pubDate');
      const category = extractTag(itemXml, 'category');

      if (title && link) {
        // 주소 끝자리에서 게시글 고유번호(articleId) 추출
        const urlParts = link.split('/');
        const articleId = urlParts[urlParts.length - 1].split('?')[0];

        allArticles.push({
          articleId,
          title,
          writer: author || '익명',
          // RSS의 시간 형식을 자바스크립트 숫자로 변환
          timestamp: pubDate ? new Date(pubDate).getTime() : Date.now(),
          category: category || '전체',
          url: link
        });
      }
    }

    // 💡 13번, 14번 게시판의 '실제 카페 메뉴 이름'을 적어주세요. (예: 공지사항, 방송후기 등)
    const TARGET_CATEGORIES = ['공지사항', '자유게시판']; 
    
    // 타겟 게시판만 필터링 (전체 글을 보려면 아래 코드를 지우고 allArticles를 반환하면 됩니다)
    const filteredArticles = allArticles.filter(article => 
      TARGET_CATEGORIES.includes(article.category)
    );

    // 최신순 정렬
    filteredArticles.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ success: true, data: filteredArticles });

  } catch (error: any) {
    console.error("카페 데이터 연동 에러:", error);
    return NextResponse.json({ 
      success: false, 
      error: '카페 데이터를 가져오지 못했습니다.',
      detail: error.message || String(error)
    }, { status: 500 });
  }
}
