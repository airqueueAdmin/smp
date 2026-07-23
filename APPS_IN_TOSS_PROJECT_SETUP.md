# Apps in Toss 새 프로젝트 부트스트랩 가이드

> 대상: Apps in Toss 비게임 WebView 미니앱을 새로 만드는 경우
>
> 기준: React + TypeScript + Vite 계열
>
> 마지막 확인: 2026-07-23
>
> 원칙: 이 문서는 프로젝트 시작용 체크리스트다. 출시 직전에는 반드시 [공식 개발자센터](https://developers-apps-in-toss.toss.im/)와 [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame.html)를 다시 확인한다.

## 0. 가장 먼저 결정할 값

아래 표를 복사해 새 프로젝트의 실제 값으로 채운다. 이 표가 콘솔, `granite.config.ts`, 백엔드 CORS, 약관, 제출 자료의 단일 기준이다.

| 항목 | 값 | 주의사항 |
| --- | --- | --- |
| 앱 이름(한글) | `<APP_DISPLAY_NAME>` | 콘솔과 `brand.displayName`을 동일하게 유지 |
| `appName` | `<APP_NAME>` | **등록 후 수정할 수 없으므로 가장 먼저 확정** |
| 앱 유형 | `비게임` | 비게임은 `webViewProps.type: 'partner'` 사용 |
| 대표 색상 | `<#RRGGBB>` | `#`을 포함한 6자리 HEX |
| 콘솔 로고 URL | `<ICON_URL>` | 콘솔에 올린 로고의 URL, 빈 값으로 빌드하지 않기 |
| 로컬 포트 | `5173` | 팀 내 다른 서비스와 겹치면 변경 |
| 운영 API | `https://<API_HOST>` | 라이브 환경은 HTTPS만 사용 |
| 고객센터 | `<EMAIL / PHONE / CHAT_URL>` | 콘솔 앱 정보에 등록 |
| 개인정보 책임자 | `<NAME / CONTACT>` | 개인정보 처리방침과 실제 운영 정보 일치 |
| 주요 앱 내 기능 | `<FEATURE_NAME> → /<PATH>` | 비게임은 최소 1개 등록 |
| 토스 로그인 | `사용 / 미사용` | 사용 시 사업자 등록과 서버 작업 필요 |
| 사용자 정보 불러오기 | `사용 / 미사용` | 토스 로그인과 별개, 필요한 항목만 요청 |
| 런타임 권한 | `<camera / photos / ...>` | 실제 사용하는 최소 권한만 등록 |
| 푸시·알림·결제 | `사용 / 미사용` | 기능별 콘솔 계약과 서버 요건을 먼저 확인 |

## 1. 고정 규칙과 프로젝트별 설정 구분

### 거의 모든 비게임 WebView 앱에 고정되는 것

- [ ] 앱은 CSR 또는 SSG로 구성한다. SSR은 사용하지 않는다.
- [ ] 비게임 공통 내비게이션 바를 사용한다.
- [ ] 앱 자체 뒤로가기와 토스 내비게이션의 뒤로가기를 중복 노출하지 않는다.
- [ ] 화면은 라이트 모드를 기준으로 만들고 Safe Area를 침범하지 않는다.
- [ ] 최초 진입 화면에서 뒤로가기를 누르면 미니앱이 정상 종료된다.
- [ ] 확대·축소가 핵심 기능이 아니라면 핀치 줌을 비활성화한다.
- [ ] 권한은 필요한 순간에 요청하고, 거부해도 나머지 기능은 사용할 수 있게 한다.
- [ ] 외부에서 받은 문자열을 `eval` 등으로 실행하지 않는다.
- [ ] 브라우저 히스토리 조작으로 자사 웹사이트로 보내지 않는다.
- [ ] 라이브 API는 HTTPS, WebSocket은 `wss://`만 사용한다.
- [ ] iOS 서드파티 쿠키에 의존하지 않고 토큰 기반 인증을 사용한다.
- [ ] API 서버 CORS에 QR 테스트 Origin과 라이브 Origin을 모두 등록한다.
- [ ] `.ait` 번들의 압축 해제 크기를 100MB 이하로 유지한다.
- [ ] 오류, 빈 상태, 로딩, 네트워크 실패, 권한 거부 화면을 준비한다.

### 앱마다 반드시 바뀌는 것

- `appName`, 앱 이름, 대표 색상, 콘솔 로고 URL
- 권한 목록과 `webViewProps`
- API URL, 공개 식별자, 기능 플래그
- 약관 URL, 개인정보 처리방침, 고객센터 정보
- 앱 내 기능 이름·설명·딥링크 경로
- 토스 로그인, 사용자 정보, 푸시·알림, 결제 등 선택 기능 설정
- 로고, 썸네일, 스크린샷, 상세 설명

## 2. 콘솔 작업을 코드보다 먼저 하기

1. [Apps in Toss 콘솔](https://apps-in-toss.toss.im/)에서 워크스페이스와 멤버 권한을 확인한다.
2. 앱을 먼저 등록하고 `appName`을 확정한다.
3. 앱 이름, 앱 유형, 대표 색상, 로고를 등록한다.
4. 콘솔의 앱 이름·`appName`·로고 URL을 위의 기준표에 기록한다.
5. 토스 로그인이나 수익화 기능을 쓸 예정이면 사업자 정보와 대표관리자 권한을 먼저 확인한다.

중요한 운영 조건:

- 개인 개발자도 기본 미니앱은 출시할 수 있지만 토스 로그인과 수익화 기능에는 사업자 등록이 필요하다.
- 약관 동의처럼 계약 권한이 필요한 작업은 대표관리자만 할 수 있다.
- 테스트 앱과 라이브 앱을 따로 등록할 수 있으나 각각의 `appName`, 설정, 번들을 혼동하지 않도록 환경표를 분리한다.

## 3. 프로젝트 생성

### 새 프로젝트

공식 생성기를 우선 사용한다. 생성 시점의 호환되는 SDK와 기본 구성을 함께 받을 수 있다.

```powershell
npx create-ait-app <APP_NAME>
cd <APP_NAME>
npm install
```

### 기존 Vite 프로젝트를 전환하는 경우

```powershell
npm install @apps-in-toss/web-framework
npx ait init
```

SDK와 TDS 버전은 임의로 과거 프로젝트에서 복사하지 않는다. 새 프로젝트 생성 시점의 공식 문서와 패키지 peer dependency를 기준으로 맞춘다.

## 4. 기본 파일 구성

권장 구조:

```text
<project>/
├─ public/
│  └─ legal/
│     ├─ terms.html
│     └─ privacy.html
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  └─ router.tsx
│  ├─ config/
│  │  └─ env.ts
│  ├─ lib/
│  │  └─ appsInToss.ts
│  └─ features/
├─ .env.example
├─ .gitignore
├─ granite.config.ts
├─ package.json
└─ APPS_IN_TOSS_VALUES.md
```

역할:

- `src/config/env.ts`: 환경변수를 한 번만 읽고 누락된 값을 즉시 검증한다.
- `src/lib/appsInToss.ts`: SDK 호출, 오류 변환, 브라우저 미리보기 fallback을 한곳에 모은다.
- `public/legal`: 콘솔에서 직접 열 수 있는 HTTPS 약관 문서를 둔다.
- `APPS_IN_TOSS_VALUES.md`: 콘솔 식별자, 딥링크, 심사 자료 위치를 기록한다. 비밀값은 기록하지 않는다.

## 5. `granite.config.ts` 기본 템플릿

```ts
import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: '<APP_NAME>',
  brand: {
    displayName: '<APP_DISPLAY_NAME>',
    primaryColor: '<#RRGGBB>',
    icon: '<ICON_URL_FROM_CONSOLE>',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
})
```

권한이 필요할 때만 추가한다.

```ts
permissions: [
  { name: 'camera', access: 'access' },
  { name: 'photos', access: 'read' },
  { name: 'clipboard', access: 'read' },
  { name: 'clipboard', access: 'write' },
]
```

설정 확인:

- [ ] `appName`이 콘솔 값과 글자 단위로 동일하다.
- [ ] `displayName`이 콘솔의 한글 앱 이름과 동일하다.
- [ ] `icon`은 콘솔에 업로드한 이미지의 실제 URL이며 비어 있지 않다.
- [ ] 사용하지 않는 권한은 제거했다.
- [ ] 비게임이면 `webViewProps.type`이 `partner`다.
- [ ] 실기기 로컬 테스트 시에만 `host`를 PC의 LAN IP로 바꾸고 개발 명령에 `--host`를 사용한다.

## 6. `package.json` 표준 스크립트

생성기가 만든 스크립트를 우선 유지하되, 팀에서는 아래 네 가지 이름을 고정하면 CI와 인수인계가 쉬워진다.

```json
{
  "scripts": {
    "dev": "granite dev",
    "build": "ait build",
    "typecheck": "tsc --noEmit",
    "verify": "npm run typecheck && npm run build"
  }
}
```

- `npm run dev`: 샌드박스 개발용
- `npm run build`: 업로드할 `<APP_NAME>.ait` 생성
- `npm run typecheck`: 타입 오류 확인
- `npm run verify`: PR 또는 출시 직전 최소 검증

프로젝트 템플릿의 실제 명령이 다르면 명령 자체보다 스크립트 이름만 통일한다.

## 7. 환경변수와 비밀값

### `.env.example`

```dotenv
# 브라우저에 노출되어도 되는 값만 VITE_ 접두사로 둔다.
VITE_APP_ENV=local
VITE_APPS_IN_TOSS_APP_NAME=<APP_NAME>
VITE_API_BASE_URL=https://api.example.com
VITE_SENTRY_DSN=

# 선택 기능의 공개 식별자 예시
VITE_CONSENTED_USER_DATA_KEY=
VITE_MESSAGE_TEMPLATE_CODE=
```

### 서버 시크릿 예시

아래 이름은 팀 표준 예시다. 사용하는 API의 공식 명칭에 맞춰 바꾼다.

```dotenv
AIT_CLIENT_ID=
AIT_CLIENT_SECRET=
AIT_MTLS_CERT_PATH=
AIT_MTLS_KEY_PATH=
AIT_DECRYPTION_KEY=
AIT_DECRYPTION_AAD=
```

보안 규칙:

- `VITE_` 환경변수는 최종 JavaScript 번들에서 사용자가 볼 수 있다.
- Client Secret, mTLS 인증서·개인키, 복호화 키, AAD는 프론트와 Git에 절대 넣지 않는다.
- `.env`, `.env.*`, 인증서 디렉터리, `*.ait`, 빌드 산출물을 Git에서 제외한다.
- 저장소에는 키 이름만 있는 `.env.example`만 커밋한다.
- 운영 시크릿은 배포 플랫폼의 Secret Manager에 보관한다.
- 로그에 토큰, 원문 개인정보, 인증서, 복호화 결과 전체를 남기지 않는다.

권장 `.gitignore`:

```gitignore
node_modules/
dist/
.granite/

*.ait

.env
.env.*
!.env.example

certs/
mTLS/
*.pem
*.key

*.log
```

## 8. 네트워크와 인증 기본값

### CORS 허용 Origin

백엔드에 아래 두 Origin을 정확히 등록한다. `*`와 credentials 조합으로 우회하지 않는다.

```text
https://<APP_NAME>.private-apps.tossmini.com
https://<APP_NAME>.apps.tossmini.com
```

개발 환경이 필요하면 명시적으로 추가한다.

```text
http://localhost:5173
http://<LOCAL_LAN_IP>:5173
```

### 네트워크 규칙

- 샌드박스에서는 HTTP가 동작할 수 있지만 라이브 토스앱에서는 HTTPS만 지원한다.
- iOS/iPadOS의 서드파티 쿠키 차단 때문에 파트너 도메인의 쿠키 세션에 의존하지 않는다.
- 인증은 짧은 수명의 토큰과 서버 검증을 기준으로 설계한다.
- 외부 요청에는 timeout, 취소, 재시도 정책을 둔다.
- 온라인 전용 기능은 오프라인·타임아웃 UI를 제공한다.

## 9. 라우팅과 앱 내 기능

라우터는 홈뿐 아니라 콘솔에 등록할 모든 딥링크 경로를 직접 열어도 렌더링되어야 한다.

```text
개발/샌드박스: intoss://<APP_NAME>/<PATH>
QR 테스트:     intoss-private://<APP_NAME>/<PATH>?_deploymentId=<DEPLOYMENT_ID>
출시 후 공유:  intoss://<APP_NAME>/<PATH>
```

체크리스트:

- [ ] `/` 직접 진입이 된다.
- [ ] 모든 앱 내 기능 path 직접 진입이 된다.
- [ ] query parameter를 파싱하고 잘못된 값에 안전하게 대응한다.
- [ ] QR 테스트의 `queryParams`는 URL encoding한다.
- [ ] 공유 링크에 `intoss-private://`를 넣지 않는다.
- [ ] 첫 화면과 하위 화면에서 뒤로가기가 각각 의도대로 동작한다.
- [ ] 비게임 앱의 앱 내 기능을 최소 1개 등록한다.

## 10. Apps in Toss SDK 호출 규칙

SDK 호출을 화면 컴포넌트에 흩어 놓지 않는다. `src/lib/appsInToss.ts` 같은 어댑터에서 다음을 공통 처리한다.

- 기능 지원 여부와 최소 토스앱 버전
- 사용자가 취소한 경우와 실제 장애의 구분
- 권한 상태 조회 → 설명 → 권한 요청 순서
- 타임아웃과 중복 클릭 방지
- 브라우저 미리보기용 mock 또는 명시적인 미지원 결과
- 오류 메시지와 모니터링 이벤트의 표준화

권한 UX 순서:

1. 권한이 필요한 기능의 CTA를 사용자가 누른다.
2. 왜 필요한지 서비스 화면에서 먼저 설명한다.
3. 현재 권한 상태를 조회한다.
4. 필요한 경우 시스템 권한 창을 연다.
5. 거부하면 설정 방법과 대체 흐름을 제공한다.

앱 진입 직후 권한·로그인·바텀시트를 연달아 자동 노출하지 않는다. 사용자가 기능의 가치를 이해한 시점에 요청한다.

## 11. UI/UX 기본값

- [ ] 비게임 공통 내비게이션 바를 사용한다.
- [ ] 앱 로고와 이름이 콘솔 정보와 동일하게 보인다.
- [ ] 토스 내비게이션의 신고, 공유, 고객센터 기능이 동작한다.
- [ ] 자체 뒤로가기 버튼을 중복 노출하지 않는다.
- [ ] `SafeAreaInsets.get()`과 `SafeAreaInsets.subscribe()`를 사용해 기기 회전과 화면 모드 변화까지 처리한다.
- [ ] 고정 하단 CTA가 홈 인디케이터와 겹치지 않는다.
- [ ] 모든 터치 영역은 충분히 크고 연속 탭에도 중복 요청이 발생하지 않는다.
- [ ] 핵심 인터랙션은 2초 이상 응답 없이 멈춰 있지 않는다.
- [ ] CTA 문구만 보고 다음 동작을 예상할 수 있다.
- [ ] 자동 바텀시트와 강제 유도 UI를 사용하지 않는다.
- [ ] 자사 앱 설치나 자사 서비스 이동을 유도하지 않는다.
- [ ] 탭바가 필요하면 토스의 플로팅 형태를 따르고 2~5개로 구성한다.

TDS는 새 프로젝트 SDK와 React 버전의 호환성을 확인한 뒤 설치한다. 기존 프로젝트의 lockfile이나 오래된 설치 명령을 그대로 복사하지 않는다.

## 12. 선택 기능 의사결정표

| 기능 | 먼저 할 콘솔 작업 | 코드·서버 핵심 | 시크릿 |
| --- | --- | --- | --- |
| 카메라·사진 | 필요한 권한 확인 | 사용 직전 권한 요청, 거부 fallback | 없음 |
| 사용자 정보 불러오기 | 노출 시점과 최소 항목 등록 | 발급된 `cud_...` 키로 SDK 호출 | 보통 없음 |
| 토스 로그인 | 사업자·대표관리자·약관·scope·콜백 설정 | 인가 코드 교환, 사용자 정보, unlink 처리 | 복호화 키 등 서버 보관 |
| 푸시·알림 | 기능 유형, 동의, 템플릿 설정 | 동의 상태와 발송 조건 관리 | 서버 인증 정보 |
| 인앱 결제·토스페이 | 사업자·계약·상품·환불 정책 | 서버 검증, 멱등성, 미지급 복구 | 결제 서버 키 |
| 공유·딥링크 | 앱 내 기능과 경로 정의 | 출시용 `intoss://` 링크 생성 | 없음 |
| 오류 모니터링 | 개인정보 전송 범위 검토 | release/environment/source map 관리 | 업로드 토큰은 CI 보관 |

### 사용자 정보 불러오기

- 토스 로그인과 별개의 기능이다.
- 필요한 정보만 선택하고 실제 필요한 행동 시점에 요청한다.
- 콘솔에서 만든 노출 시점마다 `cud_`로 시작하는 키가 발급된다.
- 이름·전화번호·주소 등 반환값은 개인정보이므로 저장 최소화와 파기 정책을 정한다.
- 탈퇴 콜백을 쓴다면 인증 검증, 재시도, 멱등 처리 후 데이터를 파기한다.

### 토스 로그인

- 자사 로그인이나 다른 간편 로그인을 함께 제공하지 않는다.
- 서비스 소개 화면을 먼저 제공한 뒤 로그인을 요청한다.
- 취소 시 사용자가 미니앱을 나갈 수 있는 흐름을 제공한다.
- `appLogin()`의 인가 코드는 브라우저에서 토큰으로 교환하지 않고 서버에 즉시 전달한다.
- 서버가 mTLS로 토큰을 발급받고 `login-me`를 호출하며 access/refresh token을 프론트 응답에 넣지 않는다.
- 사용자가 토스에서 연결을 끊으면 세션·토큰·관련 사용자 데이터를 정리한다.
- 토스가 주는 `userKey`는 앱별 식별자이므로 다른 앱의 값과 같다고 가정하지 않는다.
- CI 등 민감한 식별정보는 최소 수집, 암호화 저장, 접근 통제를 적용한다.
- 복호화 키와 mTLS 자료는 서버 시크릿으로만 취급한다.

## 13. 약관과 개인정보

기능을 확정한 직후 법률 문서를 준비한다. 출시 직전에 시작하면 콘솔 검토와 개발이 함께 막힌다.

최소 준비 항목:

- 서비스 이용약관
- 개인정보 처리방침 또는 기능에 필요한 개인정보 동의문
- 토스 로그인 사용 시 파트너사 약관과 필요한 개인정보 수집·이용 동의
- 마케팅 메시지 사용 시 선택 동의와 야간 발송 동의 여부
- 회원 탈퇴·연결 끊기·정보 삭제 절차
- 고객센터와 개인정보 문의 연락처

운영 규칙:

- 약관 URL은 외부에서 HTTPS로 직접 열려야 한다.
- 실제 수집 항목, 이용 목적, 보유 기간, 제3자 제공 내용을 코드와 일치시킨다.
- 필수와 선택 동의를 구분한다.
- 동의 철회나 탈퇴 이벤트를 받으면 서버 데이터와 세션을 함께 정리한다.
- 법적 적정성은 서비스 성격에 따라 달라지므로 필요하면 법률 검토를 받는다.

## 14. 로컬·샌드박스·토스앱 테스트

### 1단계: 일반 브라우저

```powershell
npm run dev
npm run typecheck
```

- SDK가 없는 브라우저에서도 최소한 화면과 오류 fallback을 확인한다.
- 모바일 viewport, 작은 높이, 긴 텍스트, 느린 네트워크를 점검한다.

### 2단계: 샌드박스 앱

- 최신 샌드박스 앱을 설치한다.
- 콘솔에 가입한 개인 계정으로 로그인한다.
- 로컬 개발 서버와 기기가 같은 네트워크에서 접근 가능한지 확인한다.
- `intoss://<APP_NAME>`과 모든 하위 path를 테스트한다.
- Android와 iOS에서 권한, 키보드, Safe Area, 뒤로가기를 확인한다.

### 3단계: 실제 토스앱 QR 테스트

```powershell
npm run verify
```

1. 생성된 `<APP_NAME>.ait`를 콘솔의 앱 출시 메뉴에 업로드한다.
2. 새 `deploymentId`와 번들 생성 시각을 기록한다.
3. 콘솔 QR 또는 `intoss-private://` 테스트 스킴으로 연다.
4. 최소 1회 테스트를 완료한다. 완료 전에는 검토 요청이 활성화되지 않는다.
5. QR 테스트 Origin에서 실제 API CORS와 인증을 확인한다.

QR 테스트 조건:

- 토스앱 로그인 상태
- 해당 워크스페이스 멤버
- 만 19세 이상 사용자

### 4단계: 출시 직후 스모크 테스트

- 라이브 Origin에서 CORS가 동작한다.
- 로그인과 세션 유지가 동작한다.
- 카메라·사진 등 실제 권한이 동작한다.
- 결제·인증·알림 등 운영 기능이 실제 환경에서 동작한다.
- 모니터링에 새 치명 오류가 없다.

## 15. 제출 자료를 초기에 만들어 둘 규격

| 자료 | 규격 | 비고 |
| --- | --- | --- |
| 앱 로고 | `600 × 600`, PNG | 각진 정사각형, 배경 필수, 투명 배경 금지 |
| 썸네일 | `1932 × 828`, PNG | 핵심 기능이 한눈에 보이게 구성 |
| 세로 스크린샷 | `636 × 1048`, PNG | 제출 시 최소 3장 |
| 가로 스크린샷 | `1504 × 741`, PNG | 제출 시 최소 1장 |

추천 캡처 목록:

1. 서비스의 목적을 바로 이해할 수 있는 첫 화면
2. 핵심 기능을 수행하는 화면
3. 사용자가 결과나 가치를 확인하는 화면
4. 오류·권한 팝업이 없는 정상 상태의 가로 대표 화면

로고와 썸네일에는 저작권 문제가 없는 자산만 쓰며 토스가 제공한 아이콘·이미지를 앱 로고나 썸네일로 재사용하지 않는다.

## 16. 출시 전 Definition of Done

### 코드

- [ ] `npm ci` 후 새 환경에서도 설치된다.
- [ ] `npm run verify`가 통과한다.
- [ ] `.ait`가 생성되고 압축 해제 기준 100MB 이하다.
- [ ] 비밀값이나 개인정보가 번들·Git·로그에 없다.
- [ ] 런타임 오류, 빈 화면, 무한 로딩이 없다.
- [ ] SDK 미지원·사용자 취소·권한 거부가 각각 처리된다.
- [ ] 네트워크 요청에 timeout과 오류 UI가 있다.

### 화면과 이동

- [ ] 첫 화면, 앱 내 기능 path, query 진입이 모두 된다.
- [ ] 뒤로가기, 닫기, 홈, 공유, 신고, 고객센터가 동작한다.
- [ ] Safe Area와 키보드에 콘텐츠가 가리지 않는다.
- [ ] 자체 뒤로가기와 토스 뒤로가기가 중복되지 않는다.
- [ ] 라이트 모드와 다양한 화면 크기에서 레이아웃이 깨지지 않는다.

### 서버와 개인정보

- [ ] QR/라이브 Origin이 CORS allowlist에 있다.
- [ ] 운영 API와 약관 URL이 모두 HTTPS다.
- [ ] iOS에서 쿠키 없이 인증이 유지된다.
- [ ] 콜백은 인증 검증, 멱등성, 재시도를 처리한다.
- [ ] 탈퇴·연결 끊기·동의 철회 후 데이터 삭제가 확인된다.
- [ ] 개인정보 보유 기간과 실제 삭제 작업이 일치한다.

### 콘솔과 검수

- [ ] 앱 이름, `appName`, 로고, 대표 색상이 코드와 같다.
- [ ] 앱 부제, 상세 설명, 카테고리, 고객센터를 입력했다.
- [ ] 앱 내 기능을 최소 1개 등록하고 모든 스킴을 테스트했다.
- [ ] 약관과 개인정보 문서 URL이 외부에서 열린다.
- [ ] 선택 기능의 계약·약관·템플릿·상품 설정을 완료했다.
- [ ] 로고, 썸네일, 스크린샷 규격을 확인했다.
- [ ] 실제 토스앱 QR 테스트를 최소 1회 완료했다.
- [ ] 공식 비게임 출시 체크리스트를 최신 내용으로 다시 점검했다.

## 17. 유입·리텐션 기본 세팅

기능 개발이 끝난 뒤 분석을 붙이지 말고, 첫 화면을 만들 때 아래 항목까지 함께 넣는다.

### 딥링크와 앱 내 기능

- [ ] 홈 외에 사용자가 즉시 행동할 수 있는 path를 1개 이상 만든다. 예: `/start`, `/scan`, `/check`.
- [ ] 각 path는 앱 내부 이동 없이 직접 열어도 정상 렌더링된다.
- [ ] 앱 내 기능 이름은 결과가 아니라 행동으로 쓴다. 예: `기록 시작`, `오늘 확인`.
- [ ] 공유 링크는 홈이 아닌 공유 내용과 바로 이어지는 path를 연다.
- [ ] 알림은 알림을 눌렀을 때 수행할 행동 path를 직접 연다.
- [ ] 모든 진입 링크에 `referrer` 또는 `source` query 규칙을 통일한다.

권장 규칙:

```text
intoss://<APP_NAME>/start?referrer=app_function
intoss://<APP_NAME>/result?referrer=share
intoss://<APP_NAME>/action?source=notification
```

### 출시 전 최소 이벤트

| 목적 | 권장 로그 이름 | 기록 시점 |
| --- | --- | --- |
| 화면 유입 | `<feature>_screen` | 화면이 실제 노출됐을 때 |
| 핵심 가치 미리보기 | `core_value_preview_seen` | 결과 예시나 효용을 처음 봤을 때 |
| 첫 가치 완료 | `first_value_complete` | 신규 사용자가 핵심 행동을 완료했을 때 |
| 재사용 완료 | `repeat_value_complete` | 재방문 핵심 행동을 완료했을 때 |
| 권한 제안 | `permission_offer_seen` | 권한 요청 전 자체 설명이 노출됐을 때 |
| 권한 결과 | `permission_agreed`, `permission_declined` | SDK 결과를 받았을 때 |
| 공유 | `share_start`, `share_complete` | 공유 시작과 완료 |
| 실패 | `<feature>_failed` | 사용자가 실제 실패를 경험했을 때 |

- [ ] 모든 이벤트에 진입 출처를 함께 남긴다.
- [ ] 로그 이름과 파라미터는 배포 전에 표로 고정한다.
- [ ] 첫 가치 완료율과 재사용 완료율을 같은 이벤트 정의로 계속 비교한다.
- [ ] 분석 수집이 실패해도 핵심 기능은 계속 동작하게 한다.

### 리텐션을 해치지 않는 권한 순서

1. 첫 화면에서 결과 예시나 즉시 가능한 핵심 행동을 보여준다.
2. 사용자가 첫 가치를 완료한다.
3. 재방문 효용을 한 문장으로 설명한다.
4. 사용자가 버튼을 눌렀을 때 로그인·알림·개인정보 동의를 요청한다.
5. 거부해도 로컬 기록이나 기본 기능을 유지한다.

출시 첫 주에는 기능을 많이 추가하기보다 `referrer별 진입 → 첫 가치 완료 → 다음 방문의 반복 행동 완료`를 먼저 비교한다.

## 18. 새 프로젝트용 값 기록 템플릿

새 저장소에 `APPS_IN_TOSS_VALUES.md`로 복사한다. 이 파일에는 비밀값을 넣지 않는다.

```md
# Apps in Toss Project Values

## Identity

- Display name:
- appName:
- App type: non-game
- Primary color:
- Console icon URL:
- Console workspace/app URL:

## URLs

- Local:
- Sandbox scheme: intoss://<APP_NAME>
- QR test origin: https://<APP_NAME>.private-apps.tossmini.com
- Live origin: https://<APP_NAME>.apps.tossmini.com
- API:
- Terms:
- Privacy:
- Customer support:

## Features

- App functions and paths:
- Permissions:
- Toss login: on/off
- Consented user data: on/off, public key name only
- Push/notification: on/off
- Payment: on/off

## Release

- Last tested commit:
- Last .ait filename/hash:
- Last deploymentId:
- Sandbox tested by/date:
- Toss QR tested by/date:
- Review status:
- Rollback version:
```

## 19. 첫날 60분 실행 순서

1. **0~10분:** 앱 이름, 변경 불가 `appName`, 앱 유형, 선택 기능을 확정한다.
2. **10~20분:** 콘솔에 앱을 만들고 로고 URL과 기본 정보를 기록한다.
3. **20~35분:** 공식 생성기로 프로젝트를 만들고 `granite.config.ts`를 채운다.
4. **35~45분:** `.env.example`, `.gitignore`, 표준 스크립트, SDK 어댑터를 만든다.
5. **45~55분:** API CORS에 local/QR/live Origin을 등록하고 HTTPS를 확인한다.
6. **55~60분:** 샌드박스에서 `/`와 첫 앱 내 기능 path를 열어 본다.

이후 로그인·개인정보·결제처럼 계약과 서버가 필요한 기능을 UI 개발보다 먼저 세로로 한 번 연결한다. 초기에 실제 기기에서 최소 흐름을 통과시키면 출시 직전 환경 차이로 인한 재작업을 크게 줄일 수 있다.

## 공식 문서 바로가기

- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)
- [콘솔에서 앱 등록하기](https://developers-apps-in-toss.toss.im/prepare/console-workspace.html)
- [기존 웹 프로젝트에 SDK 연동하기](https://developers-apps-in-toss.toss.im/tutorials/webview.html)
- [`granite.config.ts` 설정](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/UI/Config.html)
- [샌드박스 앱 테스트](https://developers-apps-in-toss.toss.im/development/test/sandbox.html)
- [토스앱 QR 테스트](https://developers-apps-in-toss.toss.im/development/test/toss.html)
- [미니앱 출시](https://developers-apps-in-toss.toss.im/development/deploy.html)
- [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame.html)
- [Safe Area](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%ED%99%94%EB%A9%B4%20%EC%A0%9C%EC%96%B4/safe-area.html)
- [사용자 정보 불러오기](https://developers-apps-in-toss.toss.im/prepare/user-info.html)
- [토스 로그인](https://developers-apps-in-toss.toss.im/login/intro.html)
- [미니앱 브랜딩 가이드](https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.html)
- [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide.html)
