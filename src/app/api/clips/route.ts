import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const nocache = Date.now(); // 브라우저 캐시 파괴용 시간표

    // 💡 전략: 숲 서버가 VOD만 던져주니, 아예 최신 영상 100개를 넉넉히 받아와서 우리가 '숏폼'만 걸러내자!
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=100&type=all&_t=${nocache}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!res.ok) return NextResponse.json({ clips: [] });
    const data = await res.json();
    const rawClips = Array.isArray(data?.data) ? data.data : (data?.data?.list || []);

    const hotClips = rawClips
      .map((clip: any) => {
        // [필살기] 숲 서버가 이중 삼중으로 숨겨놓은 데이터를 통째로 문자열로 만들어서 정규식으로 다 뜯어버림
        const flatStr = JSON.stringify(clip);
        
        // 1. 제목 추출
        let title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        if (title === '제목 없음') {
          const tMatch = flatStr.match(/"(?:title_name|title|vod_title)"\s*:\s*"([^"]+)"/i);
          if (tMatch) title = tMatch[1];
        }

        // 2. 조회수 추출 (숨어있는 숫자 강제 적출)
        let views = 0;
        const vMatch = flatStr.match(/"(?:view_cnt|read_cnt|total_view_cnt)"\s*:\s*"?([\d,]+)"?/i);
        if (vMatch && vMatch[1]) {
          views = parseInt(vMatch[1].replace(/,/g, ''), 10);
        }

        // 3. 썸네일 추출 (아까 몽나님 프로필 사진이 뜨던 버그 강제 차단)
        let thumb = '';
        const thumbMatch = flatStr.match(/"([^"]*?stimg\.afreecatv\.com[^"]*?)"/gi);
        if (thumbMatch) {
          for (let t of thumbMatch) {
            t = t.replace(/"/g, ''); // 쌍따옴표 제거
            // 🚨 프로필 사진(LOGO, profile)이 아닌 진짜 영상 썸네일만 채택
            if (!t.includes('LOGO') && !t.includes('profile')) {
              thumb = t;
              break;
            }
          }
        }
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');
        else if (!thumb) thumb = 'https://via.placeholder.com/320x180?text=No+Image';

        // 4. ✨ 핵심: 영상 길이(초 단위) 추출 -> 다시보기를 걸러낼 유일한 단서!
        let duration = 999999; // 기본값: 아주 긴 다시보기로 취급
        const dMatch = flatStr.match(/"(?:duration|file_duration|play_time)"\s*:\s*"?(\d+)"?/i);
        if (dMatch && dMatch[1]) {
          duration = parseInt(dMatch[1], 10);
        }

        const videoId = clip.bbs_no || clip.uc_no || clip.catch_no || clip.title_no || clip.vod_no;

        return {
          id: videoId || Math.random().toString(),
          title: title,
          thumb: thumb,
          views: views,
          duration: duration, 
          url: `https://vod.sooplive.co.kr/player/${videoId}`
        };
      })
      // 💡 [최종 숏폼 필터] 영상 길이가 20분(1200초) 이하인 숏폼/클립만 살리고, 2~3시간짜리 다시보기는 완벽 차단!
      .filter((clip: any) => clip.duration <= 1200)
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 3); 

    // 🚨 브라우저 캐시(임시저장)까지 원천 차단하는 방어막 헤더 세팅
    return NextResponse.json({ clips: hotClips }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("클립 에러:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
