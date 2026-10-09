import { NextResponse } from 'next/server';

type Streamer = {
  name: string;
  userId: string;
  profileImg: string;
  broadcastUrl: string;
};

// SOOP 공식 broad/list는 방송 중인 목록이지 닉네임 검색이 아니므로 사용하지 않음.
// Google 검색은 후보 ID 발견용으로만 사용하고, SOOP 방송국 API로 실존 계정을 검증합니다.
export async function GET(request: Request) {
  const keyword = new URL(request.url).searchParams.get('keyword')?.trim() || '';
  if (!keyword || keyword.length > 60) {
    return NextResponse.json({ streamers: [] });
  }

  try {
    const searchUrl = 'https://www.google.com/search?' + new URLSearchParams({
      q: keyword + ' 숲 site:sooplive.com/station/',
      hl: 'ko',
      num: '20'
    });
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MongnaFanpage/1.0)',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Accept: 'text/html'
      },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Google 검색 HTTP ' + response.status);
    const html = (await response.text()).replace(/\\u002f/gi, '/').replace(/\\x2f/gi, '/').replace(/&amp;/g, '&');

    const ids = new Set<string>();
    const pattern = /(?:https?:\/\/)?(?:www\.)?sooplive\.com\/station\/([A-Za-z0-9_]{2,30})/gi;
    for (const match of html.matchAll(pattern)) {
      ids.add(match[1]);
      if (ids.size >= 12) break;
    }

    // 실제 SOOP 아이디를 직접 입력한 경우도 조회 가능.
    if (/^[A-Za-z0-9_]{2,30}$/.test(keyword)) ids.add(keyword);

    const verified = await Promise.all([...ids].map(async userId => {
      try {
        const stationRes = await fetch('https://bjapi.afreecatv.com/api/' + encodeURIComponent(userId) + '/station', {
          signal: AbortSignal.timeout(4000),
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!stationRes.ok) return null;
        const data = await stationRes.json();
        const station = data?.station || {};
        const realId = String(station.user_id || data?.user_id || userId);
        const realName = String(station.user_nick || data?.user_nick || station.userNick || realId);
        if (!/^[A-Za-z0-9_]{2,30}$/.test(realId)) return null;
        const image = station.profile_img || data?.profile_img ||
          'https://profile.img.afreecatv.com/LOGO/' + realId.slice(0, 2).toLowerCase() + '/' +
          realId.toLowerCase() + '/' + realId.toLowerCase() + '.jpg';
        return {
          name: realName,
          userId: realId,
          profileImg: String(image),
          broadcastUrl: 'https://www.sooplive.com/station/' + realId
        } as Streamer;
      } catch {
        return null;
      }
    }));

    const streamers = verified.filter((item): item is Streamer => item !== null);
    const query = keyword.toLowerCase();
    streamers.sort((a, b) => Number(b.name.toLowerCase() === query) - Number(a.name.toLowerCase() === query));
    return NextResponse.json({ streamers: streamers.slice(0, 10) });
  } catch (error) {
    console.error('스트리머 검색 실패:', error);
    return NextResponse.json({ streamers: [], error: '검색 결과를 가져오지 못했습니다. 명부 등록으로 직접 추가할 수 있습니다.' });
  }
}
