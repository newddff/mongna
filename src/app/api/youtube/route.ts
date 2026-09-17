import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId') || 'UCtqsg-m0nnzd4o2vkYiP6rw';
    
    // 프론트엔드에 API 키를 보내지 않고, 서버가 직접 구글에 요청합니다.
    const apiKey = process.env.YOUTUBE_API_KEY; 
    
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=3&key=${apiKey}`;

    const res = await fetch(playlistUrl);
    if (!res.ok) throw new Error("유튜브 요청 실패");
    
    const data = await res.json();
    return NextResponse.json({ items: data.items });
  } catch (error) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
