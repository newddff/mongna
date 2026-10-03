import { NextResponse } from 'next/server';

export async function GET() {
  const CLIENT_ID = process.env.SOOP_CLIENT_ID;

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const response = await fetch(`https://openapi.sooplive.co.kr/api/broad/list?client_id=${CLIENT_ID}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "데이터 통신 실패" }, { status: 500 });
  }
}