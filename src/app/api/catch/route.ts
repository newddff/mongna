import { NextResponse } from 'next/server';

export async function GET() {
  // SOOP 서버 안정화 전까지 임시로 빈 데이터를 보내어 UI를 숨깁니다.
  return NextResponse.json({ clips: [] });
}
