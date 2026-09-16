import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // 캐시 강제 폭파 유지!

export async function GET() {
  try {
    const soopId = 'pinktape8';
    const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
    
    // 🚨 [악마 1 퇴치] Vercel이 절대 옛날 데이터를 못 쓰게, 주소 끝에 '현재 시간'을 달아버립니다! (캐시 원천 차단)
    const t = Date.now();

    // 🚨 [악마 2 퇴치] 다시보기(VOD) 금지! 오직 '캐치'와 '클립'만 각각 따로 긁어옵니다.
    const [catchRes, clipRes] = await Promise.all([
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch&t=${t}`, { headers, cache: 'no-store' }),
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=clip&t=${t}`, { headers, cache: 'no-store' })
    ]);

    const catchData = await catchRes.json().catch(() => ({}));
    const clipData = await clipRes.json().catch(() => ({}));

    // 캐치 배열과 클립 배열을 안전하게 꺼냅니다.
    const catchList = Array.isArray(catchData?.data) ? catchData.data : (catchData?.data?.list || []);
    const clipList = Array.isArray(clipData?.data) ? clipData.data : (clipData?.data?.list || []);

    // 두 영상 리스트를 하나로 합체! (여기엔 다시보기가 1%도 섞일 수 없습니다)
    const combinedClips = [...catchList, ...clipList];

    const hotClips = combinedClips
      .map((clip: any) => {
        // 💡 제목 추출
        const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        
        // 🚨 [악마 3 퇴치] 프로필 사진 낚시 방지 + 진짜 영상 썸네일 추적
        let thumb = '';
        const findThumb = (obj: any) => {
          if (!obj || typeof obj !== 'object' || thumb) return;
          for (const k in obj) {
            if (thumb) break;
            const val = obj[k];
            // 이미지 주소이면서...
            if (typeof val === 'string' && (val.includes('stimg') || val.match(/\.(jpg|jpeg|png|webp)/i) || k.includes('thumb'))) {
              // 프로필(profile), 로고(logo), 뱃지(bj_img) 글자가 들어간 사진은 쳐다보지도 않음!
              if (!val.includes('profile') && !val.includes('logo') && !val.includes('bj_img') && val.length > 15) {
                thumb = val;
              }
            } else if (typeof val === 'object') {
              findThumb(val);
            }
          }
        };
        findThumb(clip);

        // 썸네일 주소 조립
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

        // 💡 조회수 안전 추출 (숫자만 쏙쏙)
        let views = 0;
        const findViews = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const k in obj) {
            // ID 번호나 재생 시간(duration)은 조회수로 착각하지 않게 제외!
            if (['title_no', 'station_no', 'bbs_no', 'user_no', 'file_no', 'duration'].includes(k.toLowerCase())) continue;
            const val = obj[k];
            if ((typeof val === 'number' || typeof val === 'string') && 
                (k.includes('cnt') || k.includes('view') || k.includes('read') || k.includes('hit'))) {
              const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
              if (!isNaN(num) && num > views) views = num;
            } else if (typeof val === 'object') {
              findViews(val);
            }
          }
        };
        findViews(clip);

        // 고유 ID 및 링크 조립
        const id = clip.title_no || clip.catch_no || clip.uc_no || clip.bbs_no || clip.vod_no || Math.random().toString();

        return {
          id,
          title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image',
          views,
          url: `https://vod.sooplive.co.kr/player/${id}`
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 진짜 조회수 순위 정렬
      .slice(0, 3); // 깔끔하게 1,2,3등만!

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    console.error("클립 가져오기 실패:", error);
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
