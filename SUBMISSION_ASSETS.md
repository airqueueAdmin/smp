# Submission Assets

Toss 제출용 이미지와 캡처를 다시 만들 때 참고하는 메모입니다.

## 현재 서비스

- 앱 이름: `Summer Ping`
- 유형: `비게임`
- 핵심 경험: 실제 얼굴 변화와 자외선 단계로 선크림 덧바를 타이밍을 보여주는 선케어 미니앱
- 실행 주소: `http://localhost:8080`
- 최신 `deploymentId`: 항상 가장 최근 `npm run build` 출력값을 기준으로 확인

## 제출 필요 항목

### 앱 로고

- 일반 로고: `600 x 600 px`, PNG
- 다크모드 로고: `600 x 600 px`, PNG

현재 파일:

- `app-logo.png`
- `app-logo-dark.png`

### 썸네일

- 크기: `1932 x 828 px`
- 형식: PNG
- 권장 내용:
  - 앱 이름 `Summer Ping`
  - 실제 얼굴 변화 카드
  - 선크림 리마인드 메시지

### 스크린샷

- 세로형: `636 x 1048 px`, 최소 3장
- 가로형: `1504 x 741 px`, 최소 1장
- 형식: PNG

권장 구성:

1. 메인 개요 화면
2. 얼굴 촬영 및 위치 조절 화면
3. 마지막 도포 시점과 알림 상태 화면
4. 가로형 대표 소개 화면

## 캡처 시 주의점

- 앱 시작 시 알림 동의 화면이 자동으로 요청될 수 있습니다.
- 이름 정보 동의/조회는 `얼굴 촬영하기` 클릭 시 먼저 실행될 수 있습니다.
- 제출용 캡처에서는 아래 중 하나를 맞춰 두는 편이 안전합니다.
  - 이미 알림/이름 동의가 완료된 테스트 계정 사용
  - 또는 `capture` 쿼리 기반 캡처 모드 사용

## 캡처 전 점검

1. 최신 코드로 다시 `npm run build`
2. 최신 `.ait`와 제출 이미지가 같은 UI 상태인지 확인
3. 필요하면 Docker 컨테이너를 재기동
4. 이름 배지 노출 여부와 알림 문구가 의도한 상태인지 확인

## 참고 파일

- `app-logo.png`
- `app-logo-dark.png`
- `submission-thumbnail.png`
- `screenshot-portrait-1-overview.png`
- `screenshot-portrait-2-camera.png`
- `screenshot-portrait-3-reminder.png`
- `screenshot-landscape-1.png`
