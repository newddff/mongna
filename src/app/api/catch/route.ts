import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    
    // 💡 오직 '캐치(Catch)' 전용 API만 찌릅니다. (일반 클립/다시보기가 섞일 확률 0%)
    const url = `https://chapi.sooplive.co.kr/api/${soopId}/catchs?page=1&per_page=20`;
    
    const res = await fetch(url, { headers, cache: 'no-store' });
    
    // 🚨 통신 실패 시 화면 엑박 방지 (디버깅 메시지 출력)
    if (!res.ok) {
        return NextResponse.json({ 
            clips: [{ id: "err1", title: `[에러] SOOP 서버 차단됨 (${res.status})`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
        });
    }

    const json = await res.json();
    const rawItems = json?.data || json?.data?.list || [];

    // 🚨 몽나님 방송국에 진짜로 생성된 캐치가 한 개도 없을 때
    if (rawItems.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "err2", title: "최근 생성된 캐치가 없습니다. 방송을 기다려주세요!", thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
        });
    }

    // 💡 깐깐했던 필터 전면 삭제! SOOP이 주는 캐치 데이터를 있는 그대로 무조건 띄웁니다.
    const parsedItems = rawItems.map((c: any, index: number) => {
        const id = c.catch_no || c.no || c.id || `catch-${index}`;
        const title = String(c.title_name || c.title || c.catch_title || c.name || '제목 없음');
        
        // 차단당했던 임시 썸네일 대신 SOOP 공식 로고를 안전망으로 씁니다.
        let thumb = c.thumb_path || c.catch_thumb || c.thumb || c.thumbnail || 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png';
        if (String(thumb).includes('_sm.')) thumb = String(thumb).replace('_sm.', '_bg.');
        if (String(thumb).startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !String(thumb).startsWith('http')) thumb = 'https://' + String(thumb).replace(/^\/+/, '');

        const views = parseInt(String(c.read_cnt || c.view_cnt || c.count || 0).replace(/,/g, ''), 10) || 0;
        const url = `https://vod.sooplive.co.kr/player/${id}/catch`;

        return { id, title, thumb, views, url };
    });

    // 조회수 순으로 3개 정렬
    const hotClips = parsedItems
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 3);

    return NextResponse.json({ clips: hotClips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ 
        clips: [{ id: "err3", title: `[서버코드에러] ${error.message}`, thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
    });
  }
}
