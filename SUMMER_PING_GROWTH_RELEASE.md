# 썸머핑 유입·리텐션 출시 설정

> 코드에 반영된 재유입 경로를 Apps in Toss 콘솔, 알림 템플릿, 운영 지표에 연결하기 위한 실행 문서
>
> appName: `summer-ping`

## 1. 이번 변경의 기준 흐름

```text
앱 내 기능·공유·알림 유입
→ 예시 결과 또는 오늘 상태 확인
→ 지금 바름 / 덧바름 완료
→ 필요할 때만 토스 로그인·알림 동의
→ 행동 화면으로 재진입
```

첫 방문의 목표 이벤트는 `first_record_complete`, 재방문의 목표 이벤트는 `reapply_complete`로 둔다.

## 2. 콘솔에 등록할 앱 내 기능

아래 순서로 등록하고 각 링크를 QR 테스트 앱에서 직접 연다.

| 우선순위 | 기능 이름 | 딥링크 | 기대 행동 |
| --- | --- | --- | --- |
| 1 | 바른 시간 기록 | `intoss://summer-ping/start?referrer=app_function` | 한 번 눌러 첫 기록 |
| 2 | 덧바름 기록 | `intoss://summer-ping/reapply?referrer=app_function` | 재방문 기록 |
| 3 | 오늘 자외선 | `intoss://summer-ping/today?referrer=app_function` | 상태 확인·공유 |
| 4 | 선케어 기록 | `intoss://summer-ping/history?referrer=app_function` | 누적 기록 확인 |

최소 출시 범위는 1~3번이다. 기능 이름과 설명에는 `퍼스널`, `AI` 같은 구현 표현보다 사용자가 바로 할 행동을 쓴다.

## 3. 알림 템플릿 연결

발송 코드는 프론트와 서버에 동일하게 `summer-ping-reapply`를 설정한다.

```text
VITE_SMART_MESSAGE_TEMPLATE_CODE=summer-ping-reapply
SMART_MESSAGE_TEMPLATE_SET_CODE=summer-ping-reapply
```

알림 CTA의 목적지는 홈이 아니라 아래 행동 화면으로 지정한다.

```text
intoss://summer-ping/reapply?source=notification
```

권장 문구:

- 제목: `선크림 덧바를 시간이 왔어요`
- 본문: `지금 덧바르고 한 번만 눌러 기록해 보세요.`
- CTA: `덧바름 기록`

검수 항목:

- [ ] 시간 기록 전에는 로그인·알림 동의를 자동 요청하지 않는다.
- [ ] `덧바를 시간 알림 받기`를 누를 때 토스 로그인과 알림 동의가 열린다.
- [ ] 알림을 누르면 `/reapply`가 직접 열린다.
- [ ] 완료 시 `push_open`과 `reapply_complete`가 남는다.
- [ ] 발송 실패는 30초부터 지수 재시도하고 5회 실패 시 해당 예약을 중단한다.

## 4. 공유 유입

`/today`의 공유 버튼은 다음 링크를 생성한다.

```text
intoss://summer-ping/today?referrer=share
```

공유 유입은 `suncare_today_screen`의 `referrer=share`로 구분하고, 이후 `first_record_complete` 또는 `reapply_complete`까지 이어지는지 본다.

## 5. Analytics 이벤트 사전

| 이벤트 | 의미 | 핵심 파라미터 |
| --- | --- | --- |
| `suncare_home_screen` | 홈 노출 | `referrer`, `is_returning` |
| `suncare_start_screen` | 바로 기록 화면 진입 | `referrer` |
| `suncare_reapply_screen` | 덧바름 화면 진입 | `referrer` |
| `suncare_today_screen` | 오늘 상태 화면 진입 | `referrer` |
| `core_value_preview_seen` | 예시 얼굴 변화 노출 | `has_personal_face` |
| `first_record_complete` | 첫 기록 완료 | `entry_path` |
| `reapply_complete` | 덧바름 완료 | `entry_path` |
| `reminder_offer_seen` | 알림 제안 노출 | `outdoor_time` |
| `toss_login_complete` | 서버 세션 연결 완료 | `referrer` |
| `notification_agreed` | 알림 동의 완료 | `agreement_type` |
| `reminder_schedule_success` | 발송 예약 완료 | `outdoor_time`, `configured` |
| `push_open` | 알림 딥링크 진입 | `destination` |
| `share_complete` | 공유 화면 호출 완료 | `screen` |

분석 실패는 사용자 흐름을 막지 않도록 처리되어 있다. 로그가 실제 콘솔에 수집된 뒤 대표 지표와 보조 지표를 다음처럼 설정한다.

- 대표 전환: `first_record_complete`
- 재사용 행동: `reapply_complete`
- 알림 퍼널: `reminder_offer_seen → notification_agreed → reminder_schedule_success → push_open → reapply_complete`
- 공유 퍼널: `share_complete → referrer=share 화면 진입 → 기록 완료`

## 6. 첫 2주 판단 기준

절대 수치보다 동일 기간·동일 유입원 간 변화를 먼저 본다.

| 구간 | 계산 | 문제가 보이면 |
| --- | --- | --- |
| 첫 가치 완료율 | 첫 기록 완료 / 시작 화면 진입 | 버튼 문구와 첫 화면 정보량 축소 |
| 알림 연결률 | 알림 동의 완료 / 알림 제안 노출 | 제안 시점과 효용 문구 수정 |
| 알림 재행동률 | 덧바름 완료 / 알림 딥링크 진입 | `/reapply` 단계를 더 줄임 |
| 공유 유입 전환율 | 기록 완료 / 공유 유입 화면 | 공유 도착 화면의 맥락 강화 |
| 재방문 행동률 | 재사용 완료 사용자 / 첫 기록 사용자 | 기록 히스토리와 당일 효용 강화 |

한 번에 한 구간만 바꾸고 최소 한 배포 단위 동안 이벤트 정의를 유지한다.

## 7. 운영 전 필수 환경

- `ALLOWED_ORIGINS`에 local, QR 테스트, 라이브 Origin을 정확히 등록한다.
- `SMART_MESSAGE_STORE_DIR`를 재시작 후에도 유지되는 영구 볼륨에 연결한다.
- 현재 JSON 워커는 단일 replica만 사용한다. 수평 확장 전에는 DB와 작업 큐로 교체한다.
- mTLS 인증서, 키, 사용자 정보 복호화 키는 서버 시크릿으로만 보관한다.
- `SMART_MESSAGE_DEBUG_ENDPOINTS=false`를 운영 기본값으로 유지한다.
- `.ait` 빌드 환경에 `VITE_APPS_IN_TOSS_APP_NAME=summer-ping`을 넣는다.

## 8. 출시 순서

1. 운영 서버 환경변수와 영구 볼륨을 배포한다.
2. 토스 로그인 코드 교환과 `/api/users/login`을 QR 테스트로 확인한다.
3. 앱 내 기능 1~3번을 콘솔에 등록하고 직접 진입을 테스트한다.
4. 알림 템플릿 CTA를 `/reapply?source=notification`으로 바꾼다.
5. 테스트 메시지로 `push_open → reapply_complete`를 확인한다.
6. 공유 링크가 `/today?referrer=share`를 여는지 확인한다.
7. Analytics에서 위 이벤트가 들어오는지 확인한 뒤 지표를 고정한다.
8. `.ait`를 제출하고 라이브 Origin에서 같은 흐름을 다시 점검한다.
