# 몽나 Firebase/VOD 무중단 보안 전환 계획

> 상태: 설계 및 사전 점검. **현재 권한 규칙·회원 데이터·VOD 구현은 변경하지 않음.** 배포 전에 테스트 및 운영자 승인 필요.

## 현재 코드에서 확인한 위험
- `public/vod.html`: `mongna_users/{id}`에 `password` 평문 저장 및 `getDoc`으로 비밀번호 비교.
- `public/vod.html`: `localStorage('mongna-auto-login')`에 저장된 ID만으로 자동 로그인.
- `public/vod.html`: `stats.total`과 `stats.revived`를 브라우저에서 `increment` 처리. 클라이언트를 변조하면 임의 적립 가능.
- `public/vod.html`: `mongna_records` 쓰기 및 `mongna_live_viewers` 생성/삭제를 브라우저에서 수행.
- `src/app/api/auth/route.ts`: 관리자 비밀번호 성공 여부만 반환하며, 다른 API 및 Firestore 직접 쓰기와 연동된 인증 토큰이 없음.
- 운영 Firestore 규칙(운영자 제공): `mongna_users` 공개 read/create/update, `mongna_records` 공개 read/create, `mongna_live_viewers` 공개 read/write, `mongna_calendar_data` / `mongna_streams` 공개 write.

## 필수 보존 대상
- 기존 VOD 계정 ID / 닉네임
- `stats` 현재 월 총점 및 revived 값
- `periodKey`와 `history` 지난달/과거 월 랭킹
- `mongna_records` 활동 내역
- 기존 VOD 검색·수동 갱신·자동 갱신·재생기 및 실시간 시청자 목록
- 캘린더, 위키, 업보, 방송 집계, 관리자 기능

## 단계별 이행 (PR 단위)
1. **사전 준비 (현재 PR)**: 구조 문서화, 기존 필드 백업 및 테스트 항목 정의. 데이터 변경 없음.
2. **새 계정 인증 구축 (별도 PR)**: Firebase Authentication 기반 안전한 아이디 로그인. 내부용 합성 이메일을 사용할 경우 매핑 충돌 방지, 가입·비밀번호 재설정 정책 필요. Firebase Auth는 브라우저용 Web SDK이므로 서비스 계정 비밀키를 공개하지 않는다.
3. **기존 회원 이전 (별도 PR)**: 신규 인증 성공 후 서버가 기존 회원 소유권 확인 및 `uid` 연결. 레거시 평문 비밀번호 비교가 필요한 과도기에는 HTTPS 서버에서 1회만 수행, 응답/로그/Firestore에 비밀번호 반사 금지; 레이트 리밋 적용. ID만 저장된 기존 자동 로그인은 신뢰하지 않고 재로그인을 요청. 동명이인/중복 ID 및 미이전 회원 대응. 이전 전 기존 사용자와 기록은 삭제하지 않는다.
4. **포인트 API/검증 (별도 PR)**: 세션/ID 토큰 검증 후 uid 기준으로 적립; 서버 타임스탬프와 재생 구간 제한, 이벤트 중복 방지, 월별 원자적 rollover. 본인도 점수를 마음대로 전달하여 적립하는 API 금지. 외부 임베드 재생의 진정성은 완벽히 증명할 수 없다는 제약을 명시.
5. **관리자 공통 인증 (별도 PR)**: 서버 세션 / HttpOnly Secure SameSite 쿠키, 인증 실패 레이트 리밋, CSRF 보호 및 관리자 쓰기 API. 캘린더/위키/업보/커스텀 VOD를 기능별 이전.
6. **수집 서버 (별도 PR)**: SOOP 자동 수집·시청자 로그 경로를 인증된 서버 전용으로 이전. Render Admin SDK는 Firestore rules를 우회하므로 API 접근 제한 필수.
7. **최종 Firestore rules 배포**: 모든 저장 호출 전환과 테스트를 완료한 후 공개 쓰기 종료. 사용자 데이터는 본인 권한만; 관리자 변경은 서버 Admin SDK로만. **완료 전 규칙 단독 배포 금지.**
8. **민감 데이터 정리**: 마이그레이션 성공과 백업 확인 후 평문 `password` 필드 제거, 백업 접근 제한·보존 기간 확인. 공개됐을 가능성이 있는 비밀번호 재사용 금지 안내.

## 사전 준비/검증 체크리스트
- [ ] Firestore 내 `mongna_users`, `mongna_records`, `mongna_live_viewers`, `mongna_calendar_data`, `mongna_streams` 백업 및 복구 리허설 (개인정보 포함, 비공개 보관)
- [ ] Firebase Authentication의 기존 활성 로그인 제공자와 사용자 수 확인
- [ ] 실사용 회원 1명 및 신규 회원 1명 테스트 승인 확보 (비밀번호 수집/채팅 공유 금지)
- [ ] 지난달/이번 달 랭킹, 월별 rollover 비교
- [ ] 로그인, 로그아웃, 새로고침 후 재로그인, 자동 로그인 유지 정책 비교
- [ ] 자동 갱신, 재생·중지, 포인트 누적, revived 이벤트·기록, 실시간 시청자 표시 검증
- [ ] 캘린더 일정·스트리머 명부 저장 및 SOOP 수집, wiki/업보 쓰기 확인
- [ ] Firebase Rules Emulator에서 비인증 타인 수정/임의 포인트 적립/관리자 우회 거부 확인
- [ ] Preview 환경 분리 확인 (운영 Firestore에 테스트 쓰기 금지)
- [ ] 마이그레이션 중 실패 시 새로운 읽기/쓰기 경로 비활성화 및 기존 데이터 롤백 계획 수립

## 중요
- 현재 Firestore의 공개 쓰기는 실제 위험이므로 마이그레이션 기간을 최소화할 것.
- 유저 비밀번호와 Firebase 서비스 계정 키는 PR, 로그, 채팅, 스크린샷에 포함하지 말 것.
- Firebase 웹 `apiKey`는 서비스 계정 비밀키와 다름.
