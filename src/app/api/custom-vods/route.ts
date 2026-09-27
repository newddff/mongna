import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase'; // 종우님의 firebase 설정 경로에 맞게 수정

export async function GET() {
  try {
    // 1. 관리자 페이지에서 입력해둔 'custom_vods' 컬렉션을 싹 긁어옵니다.
    const querySnapshot = await getDocs(collection(db, 'custom_vods'));
    
    // 2. ["123456", "789012"] 처럼 배열 형태로 깔끔하게 정리합니다.
    const customList = querySnapshot.docs.map(doc => doc.data().vodId);
    
    // 3. VOD 재생기가 읽을 수 있게 JSON 데이터로 발송!
    return NextResponse.json(customList);
    
  } catch (error) {
    // 서버가 터져도 빈 배열을 보내서 기존 재생기가 멈추지 않게 방어
    return NextResponse.json([]); 
  }
}
