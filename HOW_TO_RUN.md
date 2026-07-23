# How To Run

`썸머핑` 실행, 스마트 발송 서버 설정, 출시 직전 점검용 메모입니다.

## 빌드

최종 Toss 업로드용 번들:

```powershell
npm run build
```

정적 웹 화면만 확인할 때:

```powershell
npm run build:web
```

- `npm run build`는 `summer-ping.ait`를 생성합니다.
- 빌드가 끝나면 콘솔 출력에 최신 `deploymentId`가 함께 표시됩니다.
- 테스트 메시지용 `SMART_MESSAGE_TEST_DEPLOYMENT_ID`는 이 최신 빌드 값과 맞춰 두는 편이 안전합니다.

## 로컬 실행

프론트 개발 서버:

```powershell
npm run dev
```

스마트 발송 서버:

```powershell
npm run dev:server
```

## 환경변수

프론트 빌드 입력:

```text
VITE_REMINDER_API_BASE_URL=http://localhost:8787
VITE_APPS_IN_TOSS_APP_NAME=summer-ping
VITE_SMART_MESSAGE_TEMPLATE_CODE=summer-ping-reapply
VITE_USER_NAME_CONSENTED_DATA_KEY=<유저정보 불러오기 이름용 cud 코드>
```

서버 필수값:

```text
SMART_MESSAGE_TEMPLATE_SET_CODE=summer-ping-reapply
SMART_MESSAGE_TEST_DEPLOYMENT_ID=<최신 deploymentId>
APPS_IN_TOSS_APP_NAME=summer-ping
APPS_IN_TOSS_CERT_PATH=<mTLS cert pem 경로>
APPS_IN_TOSS_KEY_PATH=<mTLS key pem 경로>
```

서버 선택값:

```text
SMART_MESSAGE_SERVER_PORT=8787
DEFAULT_REMINDER_MINUTES=120
APPS_IN_TOSS_BASE_URL=https://apps-in-toss-api.toss.im
SMART_MESSAGE_DEBUG_ENDPOINTS=false
SMART_MESSAGE_STORE_DIR=<운영에서 유지되는 영구 볼륨 경로>
ALLOWED_ORIGINS=http://localhost:5173,https://summer-ping.private-apps.tossmini.com,https://summer-ping.apps.tossmini.com
APPS_IN_TOSS_CERT_PEM=<PEM 문자열 그대로>
APPS_IN_TOSS_KEY_PEM=<PEM 문자열 그대로>
APPS_IN_TOSS_CERT_PEM_BASE64=<base64 encoded cert pem>
APPS_IN_TOSS_KEY_PEM_BASE64=<base64 encoded key pem>
APPS_IN_TOSS_USER_INFO_DECRYPTION_KEY=<이메일로 받은 256-bit 복호화 키>
APPS_IN_TOSS_USER_INFO_DECRYPTION_KEY_BASE64=<base64 encoded 32-byte key>
APPS_IN_TOSS_USER_INFO_AAD=<이메일로 받은 AAD>
APPS_IN_TOSS_USER_INFO_AAD_BASE64=<base64 encoded AAD>
```

메모:

- 현재 앱에서는 알림 동의 요청용 `templateCode`와 실제 발송용 `templateSetCode`를 모두 `summer-ping-reapply`로 사용합니다.
- 배포 환경에서는 인증서와 복호화 키를 프론트에 두면 안 됩니다. 반드시 서버 시크릿으로만 보관하세요.
- 토스 로그인 `authorizationCode`는 서버에서 즉시 교환합니다. `accessToken`과 `refreshToken`은 브라우저나 응답에 넣지 않습니다.
- 현재 리마인더 저장소는 단일 서버용 JSON입니다. 운영에서는 `SMART_MESSAGE_STORE_DIR`를 영구 볼륨에 연결하고 서버를 1개 replica로 실행하세요. 여러 replica가 필요하면 DB와 작업 큐로 교체해야 합니다.
- `.env.example`에 필요한 키 목록을 정리해 두었습니다.
- 운영에서는 `SMART_MESSAGE_DEBUG_ENDPOINTS=false`를 유지하는 것이 기본값입니다.

## 현재 앱 동작

- 앱 첫 진입에서는 알림이나 이름 동의를 자동 요청하지 않고, 예시 얼굴과 핵심 결과를 먼저 보여줍니다.
- `지금 바름` 또는 `덧바름 완료`를 누르면 즉시 기기에 기록됩니다.
- 카메라는 이름 제공 여부와 무관하게 사용할 수 있습니다. 이름 개인화는 별도 선택 기능입니다.
- 알림 연결 버튼을 누른 시점에만 토스 로그인과 알림 동의를 순서대로 요청합니다.
- 최근 30분 안의 기록만 서버 `/api/reminders/schedule`에 예약됩니다.
- `/start`, `/reapply`, `/today`, `/history`를 딥링크 진입 화면과 앱 내 기능으로 사용할 수 있습니다.
- 주요 화면·완료·알림·공유 이벤트는 Apps in Toss Analytics로 전송됩니다.

## 운영에서 실제 사용하는 서버 엔드포인트

- `POST /api/users/login`
- `POST /api/reminders/schedule`

## 디버그 엔드포인트

아래 엔드포인트는 `SMART_MESSAGE_DEBUG_ENDPOINTS=true`일 때만 열립니다.

- `GET /api/partner/mtls-check`
- `GET /api/reminders/status`
- `POST /api/reminders/send-now`
- `POST /api/reminders/send-test-now`
- `POST /api/users/login-me`

운영에서는 기본적으로 닫아 두는 것이 맞습니다.

## 출시 체크리스트

1. 서버 환경변수에 `SMART_MESSAGE_TEMPLATE_SET_CODE`, mTLS 인증서, 복호화 키/AAD를 설정합니다.
2. 프론트 빌드 환경에 `VITE_SMART_MESSAGE_TEMPLATE_CODE`, `VITE_USER_NAME_CONSENTED_DATA_KEY`, `VITE_REMINDER_API_BASE_URL`을 넣습니다.
3. `npm run build`를 실행하고 최신 `deploymentId`를 기록합니다.
4. 생성된 `.ait`를 Toss 콘솔에 업로드합니다.
5. 토스 인앱에서 첫 진입 시 동의 팝업 없이 예시 결과와 `지금 바름` 버튼이 보이는지 확인합니다.
6. 이름 제공 없이 `얼굴 촬영하기`가 동작하고, 이름 개인화는 별도로 선택할 수 있는지 확인합니다.
7. 기록 후 알림 연결 버튼에서 토스 로그인 → 알림 동의 → 리마인드 저장이 순서대로 동작하는지 확인합니다.
8. 실제 발송 전에 `SMART_MESSAGE_TEST_DEPLOYMENT_ID`로 테스트 메시지를 점검합니다.
9. 알림의 딥링크가 `/reapply?source=notification`을 직접 여는지 확인합니다.
10. `/start`, `/reapply`, `/today`, `/history`가 QR 테스트와 라이브 앱에서 새로고침·직접 진입 모두 동작하는지 확인합니다.
11. 운영 URL에서 약관 페이지가 외부에서 직접 열리는지 확인합니다.

## Docker

웹 정적 파일만 배포할 때:

```powershell
docker build -t summer-ping:latest .
docker rm -f summer-ping-app
docker run -d --name summer-ping-app -p 8080:80 summer-ping:latest
```

확인 주소:

```text
http://localhost:8080
http://localhost:8080/legal/terms.html
http://localhost:8080/legal/privacy-third-party-consent.html
```

## 트러블슈팅

### 알림 동의 화면이 안 뜰 때

- 최신 `.ait`가 실제로 업로드됐는지 먼저 확인합니다.
- 프론트 번들에 `VITE_SMART_MESSAGE_TEMPLATE_CODE`가 포함돼 있는지 확인합니다.
- 알림 요청은 첫 진입에 자동으로 뜨지 않습니다. 시간을 기록한 뒤 `덧바를 시간 알림 받기`를 눌러야 합니다.
- 사용자가 이미 동의한 상태라면 팝업 없이 넘어갈 수 있습니다.
- 토스 앱 `전체 탭 → 설정 → 알림 → 서비스별 알림`에서 현재 상태를 다시 확인합니다.

### 이름이 안 뜰 때

- `VITE_USER_NAME_CONSENTED_DATA_KEY`가 현재 프론트 빌드에 들어갔는지 확인합니다.
- Toss 콘솔의 사용자 정보 불러오기 설정이 현재 앱과 같은 앱에 연결되어 있는지 확인합니다.
- 이름은 카메라 사용의 필수 조건이 아닙니다. 촬영 영역의 `내 이름으로 개인화하기`를 눌렀을 때만 요청합니다.

### 서버 발송이 안 될 때

- `SMART_MESSAGE_TEMPLATE_SET_CODE`가 맞는지 확인합니다.
- mTLS 인증서와 키가 서버에 정상 주입됐는지 확인합니다.
- `ALLOWED_ORIGINS`에 현재 QR 테스트 Origin과 라이브 Origin이 모두 포함됐는지 확인합니다.
- `SMART_MESSAGE_STORE_DIR`가 서버 재시작 후에도 유지되는 볼륨인지 확인합니다.
- 운영 점검 중이라면 `SMART_MESSAGE_DEBUG_ENDPOINTS=true`로 잠깐 열고 `GET /api/partner/mtls-check`로 핸드셰이크를 볼 수 있습니다.

### `login-me` 복호화가 실패할 때

- `APPS_IN_TOSS_USER_INFO_DECRYPTION_KEY(_BASE64)`와 `APPS_IN_TOSS_USER_INFO_AAD(_BASE64)` 조합이 서로 맞는지 확인합니다.
- `APPS_IN_TOSS_USER_INFO_AAD`와 `APPS_IN_TOSS_USER_INFO_AAD_BASE64`를 동시에 넣지 않는 편이 안전합니다.
