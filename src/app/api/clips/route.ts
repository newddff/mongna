import { NextResponse } from 'next/server';

export const revalidate = 0; // 테스트를 위해 캐시 0초 (성공 확인 후 3600으로 변경!)

export async function GET() {
  try {
    const soopId = 'pinktape8'; 
    const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

    // 💡 1. 클립(유저클립)과 캐치(Catch) 두 곳을 동시에 찔러서 데이터 가져오기
    const [clipRes, catchRes] = await Promise.all([
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=user_clip`, { headers, cache: 'no-store' }),
      fetch(`https://bjapi.afreecatv.com/api/${soopId}/vods?page=1&per_page=20&type=catch`, { headers, cache: 'no-store' })
    ]);

    const clipData = await clipRes.json().catch(() => ({}));
    const catchData = await catchRes.json().catch(() => ({}));

    // 두 곳에서 가져온 데이터를 하나의 리스트로 쫙 합칩니다.
    const clipList = Array.isArray(clipData?.data) ? clipData.data : (clipData?.data?.list || []);
    const catchList = Array.isArray(catchData?.data) ? catchData.data : (catchData?.data?.list || []);
    const allShorts = [...clipList, ...catchList];

    // 💡 2. 중복 방지를 위한 안전 금고 (Map)
    const uniqueVideos = new Map();

    allShorts.forEach((clip: any) => {
      const videoId = clip.title_no || clip.catch_no || clip.uc_no || clip.bbs_no;
      if (!videoId) return;

      // 🚨 3. [핵심] 다시보기(풀영상) 철통 방어!
      // 숲 API에서 'review'는 다시보기를 뜻합니다. review거나 영상 길이가 1시간 이상이면 무조건 버립니다.
      if (clip.type === 'review' || clip.vod_type === 'review') return;
      if (clip.duration && parseInt(clip.duration) > 3600) return; 
      
      const title = clip.title_name || clip.title || clip.vod_title || '제목 없음';

      // 🚨 제목에 다시보기/풀영상이 적혀있어도 가차 없이 버립니다.
      if (title.includes('다시보기') || title.includes('풀영상')) return;

      // 💡 4. 클립/캐치 전용 썸네일 이름표 싹 다 뒤지기
      let thumb = clip.thumb || clip.thumb_path || clip.catch_thumb || clip.uc_thumb || clip.file_path || '';
      if (thumb.startsWith('//')) thumb = 'https:' + thumb;
      else if (thumb && !thumb.startsWith('http')) thumb = 'https://' + thumb.replace(/^\/+/, '');

      const rawViews = clip.view_cnt || clip.read_cnt || clip.total_view_cnt || 0;
      const views = parseInt(String(rawViews).replace(/[^0-9]/g, ''), 10) || 0;

      // 💡 5. 캐치인지 클립인지에 따라 링크(URL) 다르게 꽂아주기
      const isCatch = !!clip.catch_no || title.includes('[캐치]') || clip.type === 'catch';
      const url = isCatch
         ? `https://catch.sooplive.co.kr/player/${videoId}`
         : `https://vod.sooplive.co.kr/player/${videoId}`;

      // 💡 6. [핵심] 1, 2등 중복 방지 (금고에 없는 영상만 넣기!)
      if (!uniqueVideos.has(videoId)) {
        uniqueVideos.set(videoId, {
          id: videoId,
          title,
          thumb: thumb || 'https://via.placeholder.com/320x180?text=No+Thumbnail',
          views,
          url
        });
      }
    });

    // 진짜 숫자로 정렬하고 딱 3개만 자르기
    const hotClips = Array.from(uniqueVideos.values())
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 3);

    return NextResponse.json({ clips: hotClips });
  } catch (error) {
    return NextResponse.json({ clips: [] }, { status: 500 });
  }
}
