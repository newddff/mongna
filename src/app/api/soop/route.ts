import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, arrayUnion } from "firebase/firestore";

export const dynamic = 'force-dynamic';

const firebaseConfig = {
  apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
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
      
      const stationInfo = state?.station?.station || state?.station || {};
      const favorCnt = stationInfo.favor_cnt || 0;
      
      const statusRef = doc(db, 'mongna_calendar_data', 'broad_status');
      const now = new Date();
      
      const todayStr = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replace(/\. /g, '-').replace('.', '');
      const timeStr = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      const timestampIso = now.toISOString();

      if (broad && broad.is_live) {
        const currentTitle = broad.broad_title || '';
        const currentCategory = broad.broad_cate_name || '카테고리 없음';
        const currentViewers = broad.current_sum_viewer || 0;
        
        const statusSnap = await getDoc(statusRef);
        const prevData = statusSnap.exists() ? statusSnap.data() : null;

        if (prevData && prevData.isLive) {
          const timelineRef = collection(db, 'mongna_timeline');
          if (prevData.title !== currentTitle) await addDoc(timelineRef, { type: 'title', message: `방제 변경: ${currentTitle}`, timeStr, timestamp: timestampIso });
          if (prevData.category !== currentCategory) await addDoc(timelineRef, { type: 'category', message: `카테고리 변경: ${prevData.category} ➔ ${currentCategory}`, timeStr, timestamp: timestampIso });
        }

        let maxViewers = prevData?.maxViewers || 0;
        if (currentViewers > maxViewers) maxViewers = currentViewers;

        const currentData = {
          isLive: true, title: currentTitle, category: currentCategory,
          viewers: currentViewers, maxViewers: maxViewers,
          thumb: broad.broad_thumb || '', lastUpdated: timestampIso,
          favorCnt: favorCnt
        };
        await setDoc(statusRef, currentData, { merge: true });

        const viewerRef = doc(db, 'mongna_live_viewers', todayStr);
        await setDoc(viewerRef, { date: todayStr, logs: arrayUnion({ time: timeStr, viewers: currentViewers }) }, { merge: true });

        return NextResponse.json({ success: true, status: "방송중", favorCnt: favorCnt, data: currentData });
        
      } else {
        await setDoc(statusRef, { isLive: false, lastUpdated: timestampIso, favorCnt: favorCnt }, { merge: true });
        return NextResponse.json({ success: true, status: "오프라인", favorCnt: favorCnt });
      }
    }
    
    return NextResponse.json({ success: false, msg: "데이터 파싱 실패" });
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
