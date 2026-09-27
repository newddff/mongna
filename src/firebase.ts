import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 종우님의 진짜 Firebase 설정값
const firebaseConfig = {
  apiKey: "AIzaSyDAdur1FhGkbibSexAu0xCjlQyFzQcQCso",
  authDomain: "mongna-vod.firebaseapp.com",
  projectId: "mongna-vod",
  storageBucket: "mongna-vod.firebasestorage.app",
  messagingSenderId: "310663611402",
  appId: "1:310663611402:web:1d607304ce4d7331b5cbf3",
  measurementId: "G-Q2H7LHL29J"
};

// 파이어베이스 시작 & 데이터베이스(db) 내보내기
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
