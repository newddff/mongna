import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Vercel에 환경변수가 세팅 안 되어 있을 경우를 대비해 안전빵(Fallback) 유지
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3",
};

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const db = getFirestore(app);

export { db };
