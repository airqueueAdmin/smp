# Submission Assets

Toss 제출용 이미지와 캡처를 다시 만들 때 참고하는 메모입니다.

## 현재 서비스

- 앱 이름(한국어): `진짜 내 관상`
- 앱 이름(영어): `Facereader`
- 앱 식별자(`appName`): `summer-ping`
- 유형: `비게임`
- 핵심 경험: 기본 카메라로 촬영한 사진 한 장으로 관상 결과와 세 가지 운을 확인하는 미니앱
- 실행 주소: `http://localhost:8080`
- 최신 `deploymentId`: 항상 가장 최근 `npm run build` 출력값을 기준으로 확인

## 제출 필요 항목

### 앱 로고

- 일반 로고: `600 x 600 px`, PNG
- 다크모드 로고: `600 x 600 px`, PNG

현재 파일:

- `app-logo.png` — `600 x 600 px`
- `app-logo-dark.png` — `600 x 600 px`

### 썸네일

- 크기: `1932 x 828 px`
- 형식: PNG
- 권장 내용:
  - 앱 이름 `진짜 내 관상`
  - 얼굴 인장 심볼
  - 오늘의 얼굴 기운과 관상 결과 카드

### 스크린샷

- 세로형: `636 x 1048 px`, 최소 3장
- 가로형: `1504 x 741 px`, 최소 1장
- 형식: PNG

권장 구성:

1. 메인 관상 소개 화면
2. 기본 카메라 촬영 가이드 화면
3. 오늘의 관상 결과 화면

## 캡처 시 주의점

- 제출용 캡처에서는 `capture` 쿼리를 사용하면 화면 폭이 캡처 규격에 맞게 확장됩니다.
- 촬영 가이드는 `/?preview=guide&capture=guide`로 재현할 수 있습니다.
- 결과 화면은 `/result?preview=demo&capture=result`로 재현할 수 있습니다.

## 캡처 전 점검

1. 최신 코드로 다시 `npm run build`
2. 최신 `.ait`와 제출 이미지가 같은 UI 상태인지 확인
3. 필요하면 Docker 컨테이너를 재기동
4. 각 PNG의 픽셀 크기가 제출 규격과 정확히 일치하는지 확인

## 참고 파일

- `app-logo.png`
- `app-logo-dark.png`
- `screenshot-portrait-1-home.png`
- `screenshot-portrait-2-guide.png`
- `screenshot-portrait-3-result.png`
