import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 💡 [수동 박제 모드] 이번 주 레전드 캐치 3개의 영상 번호(ID)만 입력하세요!
    // URL 끝에 있는 숫자입니다. (예: https://vod.sooplive.co.kr/player/123456/catch -> 123456)
    // ⚠️ 지금은 임시로 하드코딩하지만, 나중엔 파이어베이스(관리자 페이지)에서 불러오면 끝입니다!
    const weeklyTop3Ids = [
        "143216853", // 🥇 1위 캐치 아이디 (예시 번호이니 실제 번호로 바꿔주세요!)
        "143216854", // 🥈 2위 캐치 아이디
        "143216855"  // 🥉 3위 캐치 아이디
    ];

    const clips = [];

    // 💡 카카오톡/디스코드 썸네일(OpenGraph) 추출 기술! (크롤링 차단 절대 불가)
    for (const id of weeklyTop3Ids) {
        if (!id) continue;
        
        const url = `https://vod.sooplive.co.kr/player/${id}/catch`;
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });
            if (!res.ok) continue;
            
            const html = await res.text();
            
            // HTML 속에 있는 og:title (제목) 과 og:image (썸네일) 만 정규식으로 쏙 빼옵니다.
            const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
            const thumbMatch = html.match(/<meta property="og:image" content="(.*?)"/);
            
            let title = titleMatch ? titleMatch[1] : '제목 없음';
            let thumb = thumbMatch ? thumbMatch[1] : 'https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png';
            
            // SOOP 특징: "몽나 - 캐치제목" 형태로 오기 때문에 앞의 "몽나 -" 글자를 깔끔하게 떼어줍니다.
            title = title.replace(/^.*?-\s*/, '');
            if (thumb.startsWith('//')) thumb = 'https:' + thumb;

            clips.push({
                id,
                title,
                thumb,
                views: 999, // 수동 박제이므로 조회수는 고정값으로 두거나 숨기시면 됩니다.
                url
            });
        } catch(e) {
            continue;
        }
    }

    if (clips.length === 0) {
        return NextResponse.json({ 
            clips: [{ id: "err", title: "레전드 캐치 ID를 코드를 열어 입력해주세요.", thumb: "https://res.sooplive.co.kr/asset/app/main/img/default_thumb.png", views: 0, url: "#" }] 
        });
    }

    return NextResponse.json({ clips }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    return NextResponse.json({ clips: [] });
  }
}
