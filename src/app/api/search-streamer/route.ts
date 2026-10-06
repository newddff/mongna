import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SOOP_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'SOOP_CLIENT_ID 환경변수가 없습니다.' },
      { status: 500 }
    );
  }

  try {
    const apiUrl =
      `https://openapi.sooplive.com/broad/list` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&select_key=cate` +
      `&select_value=` +
      `&order_type=view_cnt` +
      `&page_no=1`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
      },
      cache: 'no-store',
    });

    const data = await response.json();

    console.log(
      '🔥 SOOP API 응답:',
      JSON.stringify(data, null, 2)
    );

    return NextResponse.json(data, {
      status: response.status,
    });

  } catch (error) {
    console.error('❌ SOOP API 호출 실패:', error);

    return NextResponse.json(
      { error: 'SOOP API 호출 실패' },
      { status: 500 }
    );
  }
}
