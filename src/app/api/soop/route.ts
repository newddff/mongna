import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, runTransaction, setDoc, arrayUnion 
} from "firebase/firestore";

export const dynamic = 'force-dynamic';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// 🛠️ KST ISO 생성 헬퍼
const getStrictKstIsoString = (date: Date) => {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const min = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000+09:00`;
};

// 🛠️ 1. SOOP 시간 엄격 검증 (아직 건드리지 않고 그대로 유지)
const parseSoopTimeToKstIso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const testDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`);

  if (Number.isNaN(testDate.getTime())) return null;

  const kstCheck = new Date(testDate.getTime() + 9 * 60 * 60 * 1000);
  if (
    kstCheck.getUTCFullYear() !== Number(year) ||
    kstCheck.getUTCMonth() + 1 !== Number(month) ||
    kstCheck.getUTCDate() !== Number(day) ||
    kstCheck.getUTCHours() !== Number(hour) ||
    kstCheck.getUTCMinutes() !== Number(minute) || 
    kstCheck.getUTCSeconds() !== Number(second)    
  ) {
    return null;
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000+09:00`;
};

async function fetchSoopLiveStatus(bjid: string) {
  const url = `https://bjapi.afreecatv.com/api/${bjid}/station`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    cache: 'no-store'
  });

  if (!res.ok) throw new Error(`SOOP_API_ERROR: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== 'object') throw new Error("INVALID_JSON_STRUCTURE");

  const favorCnt = data.station?.favor_cnt || 0;

  if (data.broad === null) return { isLive: false, favorCnt };
  if (!data.broad || typeof data.broad !== 'object') throw new Error("INVALID_BROAD_OBJECT_STRUCTURE");

  const broad = data.broad;
  
  // 🔥 [유지] Vercel 콘솔에서 실제 값을 계속 모니터링하기 위한 로그
  console.log("🔥 SOOP broad 상태 확인:", {
    is_live: broad.is_live,
    broad_no: broad.broad_no,
    broad_start: broad.broad_start,
    title: broad.broad_title
  });

  // 💡 [수정됨] is_live 검사와 throw Error를 지우고 broad_no 기준으로 오프라인 판단!
  if (!broad.broad_no) return { isLive: false, favorCnt };

  const soopStartTimeKst = parseSoopTimeToKstIso(broad.broad_start);

  return {
    isLive: true,
    broadcastId: String(broad.broad_no),
    title: broad.broad_title || '',
    category: broad.broad_cate_name || '카테고리 없음',
    viewers: Number(broad.current_sum_viewer) || 0,
    thumbnail: broad.broad_thumb || '',
    favorCnt: favorCnt,
    startedAtSource: soopStartTimeKst ? "soop" : "first_detected",
    soopStartTime: soopStartTimeKst
  };
}

// 💡 [유지] 자물쇠 로직 및 파이어베이스 저장 로직
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const timestampKst = getStrictKstIsoString(now);
    const status = await fetchSoopLiveStatus('pinktape8');
    const broadStatusRef = doc(db, 'mongna_calendar_data', 'broad_status');

    // 🔴 [오프라인 처리 로직]
    if (!status.isLive) {
      const cacheSnap = await getDoc(broadStatusRef);
      if (cacheSnap.exists()) {
        const cacheData = cacheSnap.data();
        if (cacheData.isLive === true && cacheData.activeBroadcastId) {
          const targetStreamRef = doc(db, 'mongna_streams', cacheData.activeBroadcastId);
          const targetSnap = await getDoc(targetStreamRef);
          
          if (targetSnap.exists()) {
            const data = targetSnap.data();
            const startedAtDate = new Date(data.startedAt);
            
            let durationMinutes = Number(data.durationMinutes) || 0;
            if (!Number.isNaN(startedAtDate.getTime())) {
              durationMinutes = Math.max(0, Math.round((now.getTime() - startedAtDate.getTime()) / 60000));
            }
            
            const samples = Array.isArray(data.viewerSamples) ? data.viewerSamples : [];
            const totalViewers = samples.reduce((sum, sample) => sum + (Number(sample?.viewers) || 0), 0);
            const avgViewers = samples.length > 0 ? Math.round(totalViewers / samples.length) : 0;

            await setDoc(targetStreamRef, {
              isLive: false, endedAt: timestampKst, durationMinutes, avgViewers, updatedAt: timestampKst
            }, { merge: true });
          }
        }
      }
      await setDoc(broadStatusRef, { 
        isLive: false, activeBroadcastId: null, favorCnt: status.favorCnt, updatedAt: timestampKst 
      }, { merge: true });
      return NextResponse.json({ success: true, status: "오프라인" });
    }

    // 🟢 [온라인(방송중) 처리 로직]
    const streamRef = doc(db, 'mongna_streams', status.broadcastId!);
    
    await runTransaction(db, async (transaction) => {
      const streamDoc = await transaction.get(streamRef);

      if (!streamDoc.exists()) {
        transaction.set(streamRef, {
          broadcastId: status.broadcastId, streamerId: "pinktape8",
          startedAt: status.soopStartTime || timestampKst, startedAtSource: status.startedAtSource,
          endedAt: null, title: status.title, category: status.category,
          thumbnail: status.thumbnail, maxViewers: status.viewers,
          avgViewers: status.viewers, 
          viewerSamples: [{ timestamp: timestampKst, viewers: status.viewers }],
          titleChanges: [], categoryChanges: [],
          durationMinutes: null, isLive: true,
          createdAt: timestampKst, updatedAt: timestampKst
        });
      } else {
        const prevData = streamDoc.data();
        const newMaxViewers = Math.max(Number(prevData.maxViewers) || 0, status.viewers!);
        
        const prevSamples = Array.isArray(prevData.viewerSamples) ? prevData.viewerSamples : [];
        const newSample = { timestamp: timestampKst, viewers: status.viewers };
        const allSamples = [...prevSamples, newSample];
        const totalViewers = allSamples.reduce((sum, sample) => sum + (Number(sample?.viewers) || 0), 0);
        const liveAvgViewers = allSamples.length > 0 ? Math.round(totalViewers / allSamples.length) : 0;
        
        const updateData: any = {
          maxViewers: newMaxViewers,
          avgViewers: liveAvgViewers,
          thumbnail: status.thumbnail,
          isLive: true, updatedAt: timestampKst,
          viewerSamples: arrayUnion(newSample)
        };

        if (prevData.title !== status.title) {
          updateData.title = status.title;
          updateData.titleChanges = arrayUnion({ timestamp: timestampKst, before: prevData.title, after: status.title });
        }
        if (prevData.category !== status.category) {
          updateData.category = status.category;
          updateData.categoryChanges = arrayUnion({ timestamp: timestampKst, before: prevData.category, after: status.category });
        }
        transaction.update(streamRef, updateData);
      }
    });

    await setDoc(broadStatusRef, {
      isLive: true, activeBroadcastId: status.broadcastId,
      title: status.title, category: status.category,
      viewers: status.viewers, thumb: status.thumbnail,
      favorCnt: status.favorCnt, updatedAt: timestampKst
    }, { merge: true });

    return NextResponse.json({ success: true, status: "방송중", broadcastId: status.broadcastId });

  } catch (error: any) {
    console.error("Stream Collection Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
