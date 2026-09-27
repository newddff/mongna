'use client';

import React, { useState, useEffect } from 'react';
// 파이어베이스 DB 설정 파일을 불러옵니다 (종우님 프로젝트의 실제 firebase 설정 경로에 맞게 수정해주세요!)
import { db } from '@/firebase'; 
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

export default function CustomVodAdmin() {
  const [vodId, setVodId] = useState('');
  const [vodList, setVodList] = useState<{id: string, vodId: string}[]>([]);

  // DB에서 수동 리스트 불러오기
  const fetchVods = async () => {
    const querySnapshot = await getDocs(collection(db, 'custom_vods'));
    const list = querySnapshot.docs.map(doc => ({
      id: doc.id,
      vodId: doc.data().vodId
    }));
    setVodList(list);
  };

  useEffect(() => {
    fetchVods();
  }, []);

  // VOD 주소(번호) 추가하기
  const handleAdd = async () => {
    if (!vodId) return;
    await addDoc(collection(db, 'custom_vods'), { vodId: vodId });
    setVodId('');
    fetchVods(); // 추가 후 목록 새로고침
  };

  // VOD 주소(번호) 삭제하기
  const handleDelete = async (docId: string) => {
    await deleteDoc(doc(db, 'custom_vods', docId));
    fetchVods(); // 삭제 후 목록 새로고침
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>🔧 오류 VOD 강제 재생 리스트 관리</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={vodId} 
          onChange={(e) => setVodId(e.target.value)} 
          placeholder="예: 1234567 (VOD 번호 입력)"
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <button onClick={handleAdd} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          목록에 추가
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {vodList.map((item) => (
          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>VOD 번호: {item.vodId}</span>
            <button onClick={() => handleDelete(item.id)} style={{ backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
