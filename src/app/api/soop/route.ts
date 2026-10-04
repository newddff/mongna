import { NextResponse } from 'next/server';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, arrayUnion } from "firebase/firestore";

export const dynamic = 'force-dynamic';

// 💡 파이어베이스 설정
const firebaseConfig = {
  apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function GET() {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    const res = await fetch('https://m.sooplive.co.kr/pinktape8', { headers, cache: 'no-store' });
    
    if (!res.ok) throw new Error("SOOP 통신 실패");
    
    const html = await res.text();
    const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);
    
    if (match && match[1]) {
      const state = JSON.parse(match[1]);
      const broad = state?.station?.broad || null;
      
      const statusRef = doc(db, 'mongna_calendar_data', 'broad_status');
      const now = new Date();
      
      // 💡 한국 시간(KST) 기준으로 날짜와 시간 포맷팅
      const todayStr = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replace(/\. /g, '-').replace('.', ''); // 예: "2026-10-04"
      const timeStr = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now); // 예: "16:07"
      const timestampIso = now.toISOString();

      if (broad && broad.is_live) {
        const currentTitle = broad.broad_title || '';
        const currentCategory = broad.broad_cate_name || '카테고리 없음';
        const currentViewers = broad.current_sum_viewer || 0;
        
        // 1. 과거 데이터(1분 전 기억) 불러오기
        const statusSnap = await getDoc(statusRef);
        const prevData = statusSnap.exists() ? statusSnap.data() : null;

        // 2. 타임라인 기록 로직 (틀린 그림 찾기)
        if (prevData && prevData.isLive) {
          const timelineRef = collection(db, 'mongna_timeline');
          
          if (prevData.title !== currentTitle) {
            await addDoc(timelineRef, {
              type: 'title',
              message: `방제 변경: ${currentTitle}`,
              timeStr: timeStr,
              timestamp: timestampIso
            });
          }
          if (prevData.category !== currentCategory) {
            await addDoc(timelineRef, {
              type: 'category',
              message: `카테고리 변경: ${prevData.category} ➔ ${currentCategory}`,
              timeStr: timeStr,
              timestamp: timestampIso
            });
          }
        }

        // 3. 최고 시청자 수 갱신 로직
        let maxViewers = prevData?.maxViewers || 0;
        if (currentViewers > maxViewers) {
          maxViewers = currentViewers;
        }

        // 4. 현재 상태(기억 장치) 덮어쓰기
        const currentData = {
          isLive: true,
          title: currentTitle,
          category: currentCategory,
          viewers: currentViewers,
          maxViewers: maxViewers,
          thumb: broad.broad_thumb || '',
          lastUpdated: timestampIso
        };
        await setDoc(statusRef, currentData, { merge: true });

        // 5. 시청자 수 그래프 데이터 누적 (일별 배열 저장)
        const viewerRef = doc(db, 'mongna_live_viewers', todayStr);
        await setDoc(viewerRef, {
          date: todayStr,
          logs: arrayUnion({
            time: timeStr,
            viewers: currentViewers
          })
        }, { merge: true });

        return NextResponse.json({ success: true, status: "방송중", data: currentData });
        
      } else {
        // 방송이 꺼져있을 때
        await setDoc(statusRef, { 
          isLive: false, 
          lastUpdated: timestampIso 
        }, { merge: true });
        return NextResponse.json({ success: true, status: "오프라인" });
      }
    }
    
    return NextResponse.json({ success: false, msg: "데이터 파싱 실패" });
    
  } catch (error: any) {
    console.error("API 에러:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
