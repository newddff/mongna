import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // 캐시 폭파 유지 (성공하면 나중에 고치면 됩니다!)

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const res = await fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=all`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!res.ok) return NextResponse.json({ clips: [] });
    const data = await res.json();
    const rawClips = Array.isArray(data?.data) ? data.data : (data?.data?.list || []);

    const hotClips = rawClips
      .map((clip: any) => {
        // ✅ 제목 (완벽하게 작동 중!)
        const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';
        
        // 💡 [필살기 1] 객체 속을 이중 삼중으로 파고들어서 '조회수' 관련된 가장 큰 숫자 강제로 뽑아내기
        let views = 0;
        const findViews = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const k in obj) {
            // ID 번호는 조회수에서 제외
            if (['title_no', 'station_no', 'bbs_no', 'user_no', 'file_no'].includes(k.toLowerCase())) continue;
            const val = obj[k];
            if ((typeof val === 'number' || typeof val === 'string') && 
                (k.includes('cnt') || k.includes('view') || k.includes('read') || k.includes('hit'))) {
              const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
              if (!isNaN(num) && num > views) views = num;
            } else if (typeof val === 'object') {
              findViews(val); // 상자 안에 상자가 있으면 또 열어서 뒤짐!
            }
          }
        };
        findViews(clip);

        // 💡 [필살기 2] 객체 속을 파고들어서 '썸네일' 이미지 주소(stimg 등) 강제로 뽑아내기
        let thumb = '';
        const findThumb = (obj: any) => {
          if (!obj || typeof obj !== 'object' || thumb) return; // 찾았으면 멈춤
          for (const k in obj) {
            if (thumb) break;
            const val = obj[k];
            if (typeof val === 'string' && (val.includes('stimg') || val.match(/\.(jpg|jpeg|png|webp)/i) || k.includes('thumb'))) {
              if (val.length > 10) thumb = val; 
            } else if (typeof val === 'object') {
              findThumb(val);
            }
          }
        };
        findThumb(clip);

        // 이미지 주소가 이상하게 오면 강제로 https:// 조립
        if (thumb.startsWith('//')) {
          thumb = 'https:' + thumb;
        } else if (thumb && !thumb.startsWith('http')) {
          thumb = 'https://' + thumb.replace(/^\/+/, ''); 
        }

        return {
          id: clip.title_no || clip.vod_no || Math.random().toString(),
          title: title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Image', 
          views: views, 
          url: `https://vod.sooplive.co.kr/player/${clip.title_no || clip.vod_no || ''}` 
        };
      })
      .sort((a: any, b: any) => b.views - a.views) // 드디어 진짜 숫자로 1~3등 정렬!
      .slice(0, 3);

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
