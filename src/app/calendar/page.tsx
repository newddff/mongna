{/* 🌟🌟🌟 업그레이드된 디데이 위젯 시작 🌟🌟🌟 */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', marginBottom: '35px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            
            {/* 1. 방송 데뷔일 카드 */}
            <div style={{ flex: '1', minWidth: '300px', background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', border: '1px solid #ede9fe', padding: '24px 30px', borderRadius: '28px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 40px rgba(139, 92, 246, 0.08)', position: 'relative', overflow: 'hidden' }}>
              {/* 배경 워터마크 장식 */}
              <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', fontSize: '100px', opacity: 0.03, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>🎙️</div>
              
              <div style={{ fontSize: '36px', backgroundColor: '#fff', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '22px', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.12)', zIndex: 1 }}>🎙️</div>
              <div style={{ zIndex: 1, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#64748b' }}>몽나 방송 시작한 지</div>
                  {/* 👇 아래 '2023. 11. 17' 부분을 실제 몽나님 방송 시작일로 수정해주세요! */}
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', backgroundColor: '#fff', padding: '5px 12px', borderRadius: '99px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.15)', border: '1px solid #ede9fe' }}>
                    📅 2021. 11. 26
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#7c3aed', letterSpacing: '-1px' }}>D+{debutDays}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6' }}>일</div>
                </div>
              </div>
            </div>

            {/* 2. 생일 카드 */}
            <div style={{ flex: '1', minWidth: '300px', background: 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)', border: '1px solid #fce7f3', padding: '24px 30px', borderRadius: '28px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 40px rgba(236, 72, 153, 0.08)', position: 'relative', overflow: 'hidden' }}>
              {/* 배경 워터마크 장식 */}
              <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '100px', opacity: 0.03, transform: 'rotate(10deg)', pointerEvents: 'none' }}>🎂</div>
              
              <div style={{ fontSize: '36px', backgroundColor: '#fff', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '22px', boxShadow: '0 8px 20px rgba(236, 72, 153, 0.12)', zIndex: 1 }}>🎂</div>
              <div style={{ zIndex: 1, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#64748b' }}>다가오는 생일</div>
                  {/* 👇 아래 '03. 05' 부분을 실제 몽나님 생일로 수정해주세요! */}
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ec4899', backgroundColor: '#fff', padding: '5px 12px', borderRadius: '99px', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.15)', border: '1px solid #fce7f3' }}>
                    🎉 매년 03. 05
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#db2777', letterSpacing: '-1px' }}>
                  {birthDDay === 0 ? '오늘이 바로 생일! 🥳' : `D-${birthDDay}`}
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* 🌟🌟🌟 업그레이드된 디데이 위젯 끝 🌟🌟🌟 */}
