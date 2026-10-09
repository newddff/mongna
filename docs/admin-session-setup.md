# 관리자 서버 세션 기반 — 배포 전 설정

이번 PR은 기존 /api/auth 응답 형태를 유지하면서 성공한 관리자 로그인에 **서명된 HttpOnly 쿠키**를 추가합니다.

## Vercel 환경변수
- 새 환경변수 `ADMIN_SESSION_SECRET` 생성. **32자 이상의 암호학적으로 무작위인 값** 사용. 기존 `ADMIN_PASSWORD`와 다르게 만들 것.
- Vercel 프로젝트 Settings > Environment Variables 에 Production / Preview 환경을 명시해 추가.
- 비밀값은 GitHub/채팅/스크린샷에 올리지 않음. 기존 `ADMIN_PASSWORD`는 그대로 유지.
- 미설정이면 기존 로그인은 성공하지만 보안 세션은 생성하지 않음. 새 보호 API는 반드시 `isAdminSession(request)`가 true인지 확인해야 함.

## 테스트
1. 배포 후 기존 관리자 비밀번호로 로그인: 화면 기능 유지, 응답 `success:true`.
2. 같은 브라우저에서 `GET /api/auth/session`은 `{"authenticated":true}`를 반환해야 함. (Vercel 환경변수 적용 필수)
3. 익명/시크릿 브라우저에서는 `{"authenticated":false}`.
4. `DELETE /api/auth/session` 호출 후 같은 브라우저에서 false. 기존 프론트 로그아웃 버튼은 아직 이 API를 연결하지 않았으므로 테스트는 개발자 도구 또는 후속 PR에서 수행.
5. 잘못된 관리자 비밀번호는 여전히 401.
6. Playwright/수동 테스트로 캘린더·위키·VOD 기능 그대로 동작하는지 확인.

## 주의
- **중요: 이 PR은 Firestore 공개 쓰기 문제를 아직 해결하지 않습니다.** 클라이언트의 Firebase Web SDK 쓰기는 현행대로 계속 가능.
- 기존 관리자 페이지의 localStorage 기반 UI 제어는 아직 그대로이며 새로운 쿠키를 실제 저장 API에서 검증하는 후속 작업이 필요.
- 관리자 비밀번호 공격 방지: 후속 단계에서 서버측 분산 레이트 리밋, CSRF 검증, 관리자 작업용 API 입력 검증 도입.
- Firebase Admin SDK/서비스 계정은 이 PR에서 추가하지 않음. Vercel에서 비밀키를 넣어야 하는 단계가 오면 별도 지침 제공.
- 테스트 및 Firebase Rules 배포 전에는 보안 완료라고 안내하지 않음.
