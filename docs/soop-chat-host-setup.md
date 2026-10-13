# 몽나 전용 SOOP 채팅 미니게임

## 실행 주소

`https://mongna.vercel.app/streamer/minigames`

기존 `/minigames`, `/minigames/chat`와 별도 경로이며 공개 메뉴에는 링크를 추가하지 않았습니다. 주소 비공개 여부에 의존하지 않고 SOOP 인증 응답의 방송 ID를 서버에서 검사합니다. 운영 환경에서는 `pinktape8` 방송만 허용합니다. 다른 사람이 먼저 연동해도 공용 인증값을 등록하지 않으며 몽나 인증을 덮어쓸 수 없습니다.

현재 새 페이지에는 기존 사목게임을 공식 Chat SDK로 연결했습니다. 기존 사다리·대포·룰렛·외부 핀볼은 변경하지 않았습니다. 채팅 수신 기반이 준비됐으므로 다른 게임 연결은 이후 추가할 수 있습니다.

## 배포 환경변수

| 이름 | 값 |
| --- | --- |
| `SOOP_CLIENT_ID` | 승인받은 앱의 Client ID. 기존 값이 같은 앱이면 그대로 사용 |
| `SOOP_CLIENT_SECRET` | 같은 앱의 Client Secret. 서버 전용이며 `NEXT_PUBLIC_` 접두사 사용 금지 |
| `SOOP_CHAT_SESSION_SECRET` | 무작위 32자 이상 암호화 키. 예: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`로 생성 |
| `SOOP_CHAT_REDIRECT_URL` | `https://mongna.vercel.app/streamer/soop-callback` |

SOOP Developers 앱의 Redirect URL도 위 콜백 주소로 변경해야 합니다. 승인 범위에는 `broad_access_chatinfo`(채팅 메시지 조회 및 보내기)가 있어야 합니다. 환경변수 변경 후 재배포합니다. 비밀값은 GitHub와 채팅에 올리지 않습니다.

전용 인증은 기존 홈페이지 관리자 로그인과 독립적입니다. Firebase 저장소나 관리자 비밀번호를 추가로 사용하지 않습니다.

## 최초 실행과 다음 실행

1. 방송을 켠 상태에서 전용 페이지를 엽니다.
2. ‘SOOP 계정 연결’을 누르고 몽나 계정으로 SOOP 로그인·동의합니다.
3. 콜백 처리 후 게임으로 돌아옵니다. 실제 SDK 준비 이벤트를 받은 뒤 게임이 활성화됩니다.
4. 다음에는 같은 브라우저에서 페이지를 열면 저장된 인증을 확인하고 자동 연결합니다.
5. 방송이 꺼져 있으면 30초마다 방송 상태를 확인하며 기다립니다. 연결이 끊기면 재시도하고 게임·투표 시간은 일시정지합니다.

첫 연결은 공식 SDK가 사용하는 `/broad/access/chatinfo` 응답에서 본인 방송 ID를 검증하므로 방송 중에 해야 합니다. 방송을 켜지 않으면 계정을 확인할 수 없어 연동을 저장하지 않습니다. 유효하지 않은 토큰·범위도 최초 연결 시 거부되므로, 방송 중인데 실패하면 권한과 계정을 확인합니다.

인증은 브라우저별 암호화된 HttpOnly 쿠키에 저장합니다. Client Secret과 refresh token은 페이지 JavaScript에 전달하지 않고 SDK에 필요한 access token만 메모리에서 사용합니다. 인증 코드는 즉시 주소창에서 제거하고 콜백은 브라우저·탭별 난수로 검증합니다. 토큰 만료 전 서버에서 갱신합니다. 쿠키는 최대 30일 후 다시 연동해야 하며 브라우저 데이터 삭제·동의 취소·암호화 키 변경 시에도 재연동이 필요합니다.

게임을 받는 브라우저 페이지는 열어두어야 합니다. 브라우저 절전이나 백그라운드 탭 제한은 실제 방송 PC에서 확인해야 합니다. ‘연동 해제’는 이 브라우저의 연결 정보 삭제이며 SOOP 계정에 등록된 앱 동의 취소는 SOOP에서 별도로 처리합니다.

## 집에서 부계정 테스트

Vercel **Preview 환경에만** `SOOP_CHAT_TEST_STREAMER_ID=부계정영문ID`를 넣으면 해당 계정으로 테스트할 수 있습니다. 운영 배포는 이 변수를 무시하고 항상 몽나만 허용합니다. Preview의 `SOOP_CHAT_REDIRECT_URL`과 Developers의 등록 Redirect URL은 실제 Preview 주소와 일치해야 합니다. 테스트 앱을 따로 사용하면 운영 앱의 콜백 설정을 유지할 수 있습니다. localhost 개발도 테스트 계정 지정이 가능하지만 등록된 콜백 주소와 일치해야 합니다.

- 본인 테스트 방송을 켜고 연동·실시간 수신을 확인합니다.
- 스트리머가 돌을 둔 뒤 시청자 계정에서 1~7을 입력하면 투표가 올라가야 합니다. 한 턴에 사용자당 한 표, 정확한 숫자만 허용합니다.
- 연결 중지 후 투표 타이머와 돌 놓기가 멈추는지 확인합니다.
- 새로고침했을 때 다시 동의하지 않고 연결되는지 확인합니다.
- 다른 계정으로 연동하면 ‘몽나 계정으로만 사용할 수 있습니다’ 오류가 나야 합니다. Preview에서는 지정된 테스트 계정만 허용합니다.
- 운영 서버에 설정한 비밀값 없이 프런트엔드만 배포하면 연결 설정 안내를 표시합니다.

## 검증과 남은 확인

- `node --test tests/soop-chat.test.cjs`: 암호화 쿠키 변조, CSRF/잘못된 콜백, 다른 계정 거부, 미방송 최초 연결 거부, 자동 갱신, 토큰 노출 방지 검증.
- 새 코드의 타입 검사와 `npm run build` 통과. React DOM 모의 SDK로 최초 안내, 빠른 연속 채팅 투표, 중복/잘못된 투표, 연결 중지·재연결과 타이머 일시정지를 확인했습니다. 실브라우저 시각 검증은 브라우저 설치 제한으로 미완료입니다.
- 실제 계정 OAuth·실방송 채팅·SOOP 토큰 크기·refresh token 회전은 발급된 키와 방송 중 계정으로 최종 확인해야 합니다. 현재 SOOP SDK와 문서에 기반해 작성했고 자동 테스트에서는 SOOP 응답을 모의했습니다.
- 여러 탭·서버 인스턴스에서 동시에 만료 토큰을 갱신하면 SOOP의 refresh token 정책에 따라 재연동이 필요할 수 있습니다. 방송 진행 창 하나로 사용하는 것을 기본으로 합니다.
- 기존 프로젝트는 Next 설정에서 타입 검사를 생략하고 있습니다. 전체 `tsc --noEmit`에는 기존 search-streamer·calendar 코드 오류가 남아 있습니다. 이번 파일은 별도 타입 검사 대상에 포함합니다.

공식 참고: https://developers.sooplive.com/docs/chatsdk/oauth · https://developers.sooplive.com/docs/chatsdk/connection · https://developers.sooplive.com/docs/chatsdk/get-message · https://developers.sooplive.com/docs/api/auth-token
