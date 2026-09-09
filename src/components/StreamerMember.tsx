'use client';

import React, { useEffect, useState } from 'react';

interface StreamerMemberProps {
  streamerId: string; // 숲 아이디 또는 닉네임
}

export default function StreamerMember({ streamerId }: StreamerMemberProps) {
  const [streamerData, setStreamerData] = useState({
    nickname: streamerId,
    profileImg: `https://profile.img.sooplive.co.kr/LOGO/${streamerId.charAt(0)}/${streamerId}/${streamerId}.jpg`,
    stationUrl: `https://www.sooplive.com/station/${streamerId}`
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/streamer?id=${encodeURIComponent(streamerId)}`);
        if (res.ok) {
          const data = await res.json();
          setStreamerData({
            nickname: data.nickname,
            profileImg: data.profileImg,
            stationUrl: data.stationUrl
          });
        }
      } catch (err) {
        console.error("스트리머 정보 로드 실패:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (streamerId) {
      fetchInfo();
    }
  }, [streamerId]);

  return (
    <a 
      href={streamerData.stationUrl} 
      target="_blank" 
      rel="noreferrer" 
      title={`${streamerData.nickname} 방송국 바로가기`} 
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', transition: '0.2s' }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <img 
        src={streamerData.profileImg} 
        alt={streamerData.nickname} 
        style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C1ACD7', background: '#ddd', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
        onError={(e: any) => { 
          e.target.src = `https://via.placeholder.com/56/C1ACD7/ffffff?text=${encodeURIComponent(streamerData.nickname.charAt(0))}`; 
        }}
      />
      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
        {streamerData.nickname}
      </span>
    </a>
  );
}
