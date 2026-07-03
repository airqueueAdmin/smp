import {
  OpenCameraPermissionError,
  openCamera,
  requestNotificationAgreement,
} from '@apps-in-toss/web-framework'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

type SunscreenStage = 'fresh' | 'fading' | 'warning' | 'burned'
type OutdoorTime = 'short' | 'medium' | 'long'
type CaptureMode = 'overview' | 'camera' | 'reminder' | 'landscape' | 'thumbnail'
type CaptureScenario = {
  stage: SunscreenStage
  uv: number
  hour: number
  temperature: number
  exposureMinutes: number
  lastAppliedAt: string
  nextAction: string
  headline: string
  description: string
  cameraMessage: string
}

const LAST_APPLIED_AT_KEY = 'summer-ping:last-applied-at'
const NOTIFICATION_AGREEMENT_KEY = 'summer-ping:notification-agreement'
const USER_KEY_STORAGE_KEY = 'summer-ping:user-key'
const USER_NAME_STORAGE_KEY = 'summer-ping:user-name'
const ACCESS_TOKEN_STORAGE_KEY = 'summer-ping:access-token'
const NOTIFICATION_TEMPLATE_CODE = import.meta.env.VITE_SMART_MESSAGE_TEMPLATE_CODE
const REMINDER_API_BASE_URL =
  import.meta.env.VITE_REMINDER_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '')
const DEMO_FACE_IMAGE_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">
    <defs>
      <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f3ccae"/>
        <stop offset="100%" stop-color="#e8b48f"/>
      </linearGradient>
      <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2a3654"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
    </defs>
    <rect width="240" height="300" fill="#d9eaff"/>
    <ellipse cx="120" cy="150" rx="76" ry="94" fill="url(#skin)"/>
    <path d="M49 137c2-66 42-105 98-105 41 0 71 19 86 52-11-9-26-16-44-18-9 30-31 51-59 61-27 10-54 12-81 10z" fill="url(#hair)"/>
    <path d="M49 143c5 67 37 113 71 113 35 0 72-48 77-117-14 14-36 25-58 28-33 5-65-4-90-24z" fill="url(#skin)" opacity=".22"/>
    <ellipse cx="93" cy="149" rx="9" ry="7" fill="#2b3447"/>
    <ellipse cx="149" cy="149" rx="9" ry="7" fill="#2b3447"/>
    <path d="M120 166c7 0 12 8 12 17 0 9-5 13-12 13-7 0-12-4-12-13 0-9 5-17 12-17z" fill="#dd9a78" opacity=".75"/>
    <path d="M87 207c11 12 24 18 40 18 16 0 29-6 41-18" fill="none" stroke="#bc6d60" stroke-linecap="round" stroke-width="8"/>
    <ellipse cx="75" cy="126" rx="15" ry="28" fill="#2a3654"/>
    <ellipse cx="164" cy="126" rx="15" ry="28" fill="#2a3654"/>
  </svg>
`)}` as const

function getCaptureScenario(capture: string | null): CaptureScenario | null {
  switch (capture as CaptureMode | null) {
    case 'overview':
      return {
        stage: 'warning',
        uv: 7,
        hour: 13,
        temperature: 31,
        exposureMinutes: 114,
        lastAppliedAt: '2026-07-02T11:18:00+09:00',
        nextAction: '지금 덧바를 시간',
        headline: '내 얼굴이 타기 전에 바로 알려줘요',
        description: '자외선 단계와 마지막 도포 시점을 합쳐, 얼굴 변화로 덧바를 타이밍을 직관적으로 보여줍니다.',
        cameraMessage: '촬영한 얼굴에 붉어짐과 탄 톤 변화가 그대로 겹쳐 보여요.',
      }
    case 'camera':
      return {
        stage: 'fading',
        uv: 5,
        hour: 10,
        temperature: 28,
        exposureMinutes: 62,
        lastAppliedAt: '2026-07-02T09:24:00+09:00',
        nextAction: '30분 안에 덧바르기 권장',
        headline: '촬영 직후 위치를 맞추고 바로 확인해요',
        description: '얼굴 위치 조절 UI를 변화 카드 안쪽에 붙여서, 리소스를 많이 쓰지 않고도 바로 정렬할 수 있게 했습니다.',
        cameraMessage: '가이드 라인 안에서 확대와 위아래 위치만 조절하면 바로 적용됩니다.',
      }
    case 'reminder':
      return {
        stage: 'fresh',
        uv: 6,
        hour: 12,
        temperature: 30,
        exposureMinutes: 24,
        lastAppliedAt: '2026-07-02T11:46:00+09:00',
        nextAction: '14:00 전에 한 번 더 확인',
        headline: '앱을 나가도 마지막 도포 시점을 유지해요',
        description: '마지막으로 바른 시간은 로컬에 유지하고, 알림 동의가 있으면 서버 예약까지 이어집니다.',
        cameraMessage: '방금 덧바른 직후의 건강한 얼굴 상태를 기본값으로 유지합니다.',
      }
    case 'landscape':
      return {
        stage: 'warning',
        uv: 7,
        hour: 14,
        temperature: 31,
        exposureMinutes: 126,
        lastAppliedAt: '2026-07-02T11:54:00+09:00',
        nextAction: '지금 덧바를 시간',
        headline: '선크림을 발라요',
        description: '내 얼굴이 어떻게 달라지는지 보여줘서, 덧바를 타이밍을 놓치지 않게 만드는 선크림 리마인드 서비스입니다.',
        cameraMessage: '촬영한 얼굴이 붉어지고 어두워지는 변화를 단계별로 한눈에 확인할 수 있어요.',
      }
    case 'thumbnail':
      return {
        stage: 'warning',
        uv: 7,
        hour: 14,
        temperature: 31,
        exposureMinutes: 126,
        lastAppliedAt: '2026-07-02T11:54:00+09:00',
        nextAction: '지금 덧바를 시간',
        headline: '선크림을 발라요',
        description: '실제 얼굴 변화로 덧바를 타이밍을 알려주는 Summer Ping',
        cameraMessage: '자외선이 강한 시간대에는 얼굴 변화가 더 빠르게 보입니다.',
      }
    default:
      return null
  }
}

function getUvLevelCopy(uv: number) {
  if (uv >= 8) {
    return '매우 높음'
  }

  if (uv >= 6) {
    return '높음'
  }

  if (uv >= 3) {
    return '보통'
  }

  return '낮음'
}

function getUvToneClass(uv: number) {
  if (uv >= 8) {
    return 'uv-card uv-card--very-high'
  }

  if (uv >= 6) {
    return 'uv-card uv-card--high'
  }

  if (uv >= 3) {
    return 'uv-card uv-card--medium'
  }

  return 'uv-card uv-card--low'
}

function resolveAutoConditions() {
  const now = new Date()
  const hour = now.getHours()
  const month = now.getMonth() + 1

  let uv = 4
  let temperature = 27

  if (month >= 6 && month <= 8) {
    uv = 6
    temperature = 30
  }

  if (hour >= 11 && hour <= 16) {
    uv += 2
    temperature += 1
  }

  return { hour, uv, temperature }
}

function getExposureMinutes(lastAppliedMinutesAgo: number, outdoorTime: OutdoorTime) {
  const outdoorBonus = outdoorTime === 'medium' ? 20 : outdoorTime === 'long' ? 45 : 0
  return Math.max(0, lastAppliedMinutesAgo + outdoorBonus)
}

function getSunscreenStage(exposureMinutes: number, uv: number): SunscreenStage {
  const weightedExposure = exposureMinutes + Math.max(0, uv - 5) * 12

  if (weightedExposure >= 185) {
    return 'burned'
  }

  if (weightedExposure >= 130) {
    return 'warning'
  }

  if (weightedExposure >= 80) {
    return 'fading'
  }

  return 'fresh'
}

function getStageCopy(stage: SunscreenStage) {
  if (stage === 'fresh') {
    return {
      badge: '안전',
      title: '지금은 피부 보호막이 비교적 안정적이에요.',
      body: '지금처럼 제때 덧바르면 얼굴 변화가 크게 진행되지 않아요.',
      button: '다음 리마인드 준비',
      level: 18,
    }
  }

  if (stage === 'fading') {
    return {
      badge: '희미해짐',
      title: '선크림 효과가 서서히 약해지고 있어요.',
      body: '이 단계부터는 얼굴 이미지가 살짝 붉어지는 변화가 시작됩니다.',
      button: '지금 덧바르기',
      level: 42,
    }
  }

  if (stage === 'warning') {
    return {
      badge: '경고',
      title: '지금 덧바르지 않으면 피부 표현이 빠르게 타요.',
      body: '촬영한 얼굴이 눈에 띄게 어두워지고 피부결이 거칠어지는 단계입니다.',
      button: '즉시 덧바르기',
      level: 72,
    }
  }

  return {
    badge: '탐',
    title: '이미 늦었어요. 얼굴 이미지가 탄 상태로 바뀝니다.',
    body: '다음 외출부터는 특정 시간대 이전에 다시 바르도록 습관을 만들어야 합니다.',
    button: '다음 알림 설정',
    level: 94,
  }
}

function getFaceToneClass(stage: SunscreenStage) {
  if (stage === 'fresh') {
    return 'face-visual face-visual--fresh'
  }

  if (stage === 'fading') {
    return 'face-visual face-visual--fading'
  }

  if (stage === 'warning') {
    return 'face-visual face-visual--warning'
  }

  return 'face-visual face-visual--burned'
}

function getNextAction(stage: SunscreenStage, hour: number) {
  if (stage === 'fresh') {
    return `${hour + 2}:00 전에 한 번 더 확인`
  }

  if (stage === 'fading') {
    return '30분 안에 덧바르기 권장'
  }

  if (stage === 'warning') {
    return '지금 덧바를 시간'
  }

  return '다음 외출 전 리마인드 필수'
}

function getInitialLastAppliedAt() {
  return window.localStorage.getItem(LAST_APPLIED_AT_KEY)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getInitialNotificationAgreement() {
  return window.localStorage.getItem(NOTIFICATION_AGREEMENT_KEY) ?? 'unknown'
}

function getInitialUserKey() {
  return window.localStorage.getItem(USER_KEY_STORAGE_KEY) ?? ''
}

function getInitialUserName() {
  return window.localStorage.getItem(USER_NAME_STORAGE_KEY) ?? ''
}

function getInitialAccessToken(searchParams: URLSearchParams) {
  const fromQuery = searchParams.get('accessToken')

  if (fromQuery) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, fromQuery)
    return fromQuery
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? ''
}

function buildApiUrl(path: string) {
  return REMINDER_API_BASE_URL ? `${REMINDER_API_BASE_URL}${path}` : path
}

function hasCompletedNotificationAgreement(agreement: string) {
  return agreement === 'newAgreement' || agreement === 'alreadyAgreed'
}

export function HomePage() {
  const [searchParams] = useSearchParams()
  const [lastAppliedAt, setLastAppliedAt] = useState(() => getInitialLastAppliedAt())
  const [outdoorTime, setOutdoorTime] = useState<OutdoorTime>('medium')
  const [hasHat, setHasHat] = useState(false)
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null)
  const [faceScale, setFaceScale] = useState(1)
  const [faceOffsetY, setFaceOffsetY] = useState(0)
  const [cameraMessage, setCameraMessage] = useState('아직 촬영한 얼굴 이미지가 없어요.')
  const [notificationAgreement, setNotificationAgreement] = useState(() => getInitialNotificationAgreement())
  const [userKey, setUserKey] = useState(() => getInitialUserKey())
  const [userName, setUserName] = useState(() => getInitialUserName())
  const [notificationMessage, setNotificationMessage] = useState(
    '앱을 나가도 알림을 받으려면 먼저 알림 동의를 받아야 해요.',
  )
  const capture = searchParams.get('capture')
  const [accessToken, setAccessToken] = useState(() => getInitialAccessToken(searchParams))
  const captureScenario = useMemo(() => getCaptureScenario(capture), [capture])
  const { hour, uv, temperature } = useMemo(() => resolveAutoConditions(), [])
  const now = useMemo(() => new Date(), [])

  const isOverviewCapture = capture === 'overview'
  const isCameraCapture = capture === 'camera'
  const isReminderCapture = capture === 'reminder'
  const isLandscapeCapture = capture === 'landscape'
  const isThumbnailCapture = capture === 'thumbnail'
  const isCaptureMode = capture !== null

  const lastAppliedMinutesAgo = useMemo(() => {
    if (!lastAppliedAt) {
      return 0
    }

    const diffMs = now.getTime() - new Date(lastAppliedAt).getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60)))
  }, [lastAppliedAt, now])
  const exposureMinutes = useMemo(
    () => getExposureMinutes(lastAppliedMinutesAgo, outdoorTime),
    [lastAppliedMinutesAgo, outdoorTime],
  )
  const adjustedExposure = hasHat ? Math.max(0, exposureMinutes - 18) : exposureMinutes
  const stage = useMemo(() => getSunscreenStage(adjustedExposure, uv), [adjustedExposure, uv])
  const displayHour = captureScenario?.hour ?? hour
  const displayUv = captureScenario?.uv ?? uv
  const displayTemperature = captureScenario?.temperature ?? temperature
  const displayExposure = captureScenario?.exposureMinutes ?? adjustedExposure
  const displayStage = captureScenario?.stage ?? stage
  const stageCopy = useMemo(() => getStageCopy(displayStage), [displayStage])
  const nextAction = captureScenario?.nextAction ?? getNextAction(displayStage, displayHour)
  const uvLevelCopy = getUvLevelCopy(displayUv)
  const uvToneClass = getUvToneClass(displayUv)
  const displayLastAppliedAt = captureScenario?.lastAppliedAt ?? lastAppliedAt
  const formattedLastAppliedAt = displayLastAppliedAt ? formatDateTime(displayLastAppliedAt) : ''
  const displayFaceImageUri = captureScenario ? DEMO_FACE_IMAGE_URI : capturedImageUri
  const hasFaceImage = Boolean(displayFaceImageUri)
  const faceImageStyle = {
    transform: `translateX(-50%) translateY(${faceOffsetY}px) scale(${faceScale})`,
  }
  const faceImageMiniStyle = {
    transform: `translateX(-50%) translateY(${Math.round(faceOffsetY * 0.32)}px) scale(${faceScale})`,
  }
  const displayFaceImageStyle = captureScenario
    ? { transform: 'translateX(-50%) translateY(4px) scale(1.08)' }
    : faceImageStyle
  const displayFaceImageMiniStyle = captureScenario
    ? { transform: 'translateX(-50%) translateY(1px) scale(1.08)' }
    : faceImageMiniStyle
  const displayCameraMessage = captureScenario?.cameraMessage ?? cameraMessage
  const hasNotificationAgreement = hasCompletedNotificationAgreement(notificationAgreement)
  const [hasStarted, setHasStarted] = useState(() => !NOTIFICATION_TEMPLATE_CODE || hasNotificationAgreement)

  useEffect(() => {
    if (!userKey) {
      return
    }

    window.localStorage.setItem(USER_KEY_STORAGE_KEY, userKey)
  }, [userKey])

  useEffect(() => {
    if (!userName) {
      return
    }

    window.localStorage.setItem(USER_NAME_STORAGE_KEY, userName)
  }, [userName])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
  }, [accessToken])

  useEffect(() => {
    if (isCaptureMode || userKey || !accessToken) {
      return
    }

    const controller = new AbortController()

    fetch(buildApiUrl('/api/users/login-me'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error ?? 'userKey 조회에 실패했어요.')
        }

        const nextUserKey = String(result.user.userKey)
        const nextUserName = typeof result.user.name === 'string' ? result.user.name.trim() : ''
        setUserKey(nextUserKey)
        if (nextUserName) {
          setUserName(nextUserName)
        }
        setNotificationMessage('알림 발송에 필요한 사용자 정보를 연결했어요.')
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        setNotificationMessage(error instanceof Error ? error.message : 'userKey 조회에 실패했어요.')
      })

    return () => controller.abort()
  }, [accessToken, isCaptureMode, userKey])

  useEffect(() => {
    if (isCaptureMode) {
      return
    }

    if (hasNotificationAgreement) {
      setNotificationMessage('앱을 나가도 알림을 받을 수 있도록 동의가 연결되어 있어요.')
      setHasStarted(true)
      return
    }

    if (!NOTIFICATION_TEMPLATE_CODE) {
      setNotificationMessage('알림 템플릿 코드가 아직 연결되지 않았어요.')
      setHasStarted(true)
    }
  }, [hasNotificationAgreement, isCaptureMode])

  useEffect(() => {
    if (!hasNotificationAgreement || !userKey || !lastAppliedAt) {
      return
    }

    const controller = new AbortController()

    fetch(buildApiUrl('/api/reminders/schedule'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userKey,
        lastAppliedAt,
        outdoorTime,
        notificationAgreement,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error ?? '리마인드 예약에 실패했어요.')
        }

        setNotificationMessage(
          result.configured
            ? `알림 예약을 저장했어요. 다음 서버 예약 시각은 ${formatDateTime(result.nextReminderAt)} 입니다.`
            : '알림 예약은 저장했지만 서버 mTLS 설정이 아직 없어 실제 발송은 되지 않습니다.',
        )
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        setNotificationMessage(error instanceof Error ? error.message : '리마인드 예약 동기화에 실패했어요.')
      })

    return () => controller.abort()
  }, [hasNotificationAgreement, lastAppliedAt, notificationAgreement, outdoorTime, userKey])

  function requestNotificationOnboarding() {
    if (!NOTIFICATION_TEMPLATE_CODE) {
      setNotificationMessage('알림 템플릿 코드가 아직 연결되지 않았어요.')
      setHasStarted(true)
      return
    }

    const cleanup = requestNotificationAgreement({
      options: {
        templateCode: NOTIFICATION_TEMPLATE_CODE,
      },
      onEvent: ({ type }) => {
        window.localStorage.setItem(NOTIFICATION_AGREEMENT_KEY, type)
        setNotificationAgreement(type)

        if (type === 'newAgreement') {
          setNotificationMessage('알림 동의를 완료했어요. 이제 앱을 나가도 알림을 보낼 수 있습니다.')
          setHasStarted(true)
        } else if (type === 'alreadyAgreed') {
          setNotificationMessage('이미 알림 동의가 되어 있어요.')
          setHasStarted(true)
        } else {
          setNotificationMessage('알림 동의를 거부했어요. 알림 없이 계속 사용할 수 있습니다.')
        }

        cleanup()
      },
      onError: (error) => {
        console.error('알림 동의 요청에 실패했어요:', error)
        setNotificationMessage('알림 동의 요청에 실패했어요. 토스 앱 환경에서 다시 시도해 주세요.')
        cleanup()
      },
    })

    return cleanup
  }

  async function handleOpenCamera() {
    try {
      const permission = await openCamera.getPermission()

      if (permission !== 'allowed') {
        const requestedPermission = await openCamera.openPermissionDialog()

        if (requestedPermission !== 'allowed') {
          setCameraMessage('카메라 권한이 필요해요. 권한을 허용해야 얼굴 이미지를 붙일 수 있어요.')
          return
        }
      }

      const response = await openCamera({ base64: true, maxWidth: 720 })
      const imageUri = `data:image/jpeg;base64,${response.dataUri}`
      setCapturedImageUri(imageUri)
      setFaceScale(1)
      setFaceOffsetY(0)
      setCameraMessage('촬영한 얼굴 이미지를 적용했어요. 이제 단계별 피부 변화가 이 얼굴 위에 반영됩니다.')
    } catch (error) {
      if (error instanceof OpenCameraPermissionError) {
        setCameraMessage('카메라 권한이 거부되었어요. 권한 허용 후 다시 촬영해 주세요.')
        return
      }

      console.error('사진을 가져오는 데 실패했어요:', error)
      setCameraMessage('얼굴 촬영에 실패했어요. 토스 앱 환경에서 다시 시도해 주세요.')
    }
  }

  function handlePrimaryAction() {
    if (stage === 'fresh') {
      setCameraMessage('지금은 보호 상태예요. 다음 확인 시간에 다시 보면 됩니다.')
      return
    }

    const nextAppliedAt = new Date().toISOString()
    window.localStorage.setItem(LAST_APPLIED_AT_KEY, nextAppliedAt)
    setLastAppliedAt(nextAppliedAt)
    setCameraMessage('선크림을 다시 발랐어요. 얼굴 상태를 바로 안전 단계로 되돌렸습니다.')
  }

  function renderFaceVisual(visualStage: SunscreenStage, options?: { mini?: boolean; showGuide?: boolean; label?: string }) {
    const mini = options?.mini ?? false

    return (
      <div className={getFaceToneClass(visualStage)}>
        {hasFaceImage ? (
          <img
            className={mini ? 'face-visual__image face-visual__image--mini' : 'face-visual__image'}
            style={mini ? displayFaceImageMiniStyle : displayFaceImageStyle}
            src={displayFaceImageUri ?? undefined}
            alt={options?.label ?? '얼굴 상태'}
          />
        ) : (
          <div className={mini ? 'face-visual__head face-visual__head--mini' : 'face-visual__head'} />
        )}
        <div className="face-visual__cheek face-visual__cheek--left" />
        <div className="face-visual__cheek face-visual__cheek--right" />
        <div className="face-visual__burn" />
        {!mini && options?.showGuide && hasFaceImage ? <div className="face-visual__guide" /> : null}
        {!mini && options?.label ? <span className="face-visual__label">{options.label}</span> : null}
      </div>
    )
  }

  if (captureScenario) {
    return (
      <div
        className={
          isLandscapeCapture || isThumbnailCapture
            ? `submission-capture submission-capture--wide submission-capture--${capture}`
            : `submission-capture submission-capture--portrait submission-capture--${capture}`
        }
      >
        {(isOverviewCapture || isCameraCapture || isReminderCapture) && (
          <>
            <section className="submission-hero">
              <div className="submission-hero__row">
                <div>
                  <p className="submission-hero__eyebrow">Summer Ping</p>
                  <h2 className="submission-hero__title">{captureScenario.headline}</h2>
                  <p className="submission-hero__description">{captureScenario.description}</p>
                </div>
                <div className="submission-hero__badges">
                  <span className="submission-chip submission-chip--strong">{nextAction}</span>
                  <span className="submission-chip">
                    {String(displayHour).padStart(2, '0')}:00 · UV {displayUv}
                  </span>
                </div>
              </div>
            </section>

            <section className="submission-surface">
              <div className="submission-surface__header">
                <div>
                  <p className="content-panel__eyebrow">Core Experience</p>
                  <h3 className="content-panel__title">실제 얼굴 변화</h3>
                </div>
                <span className="status-badge status-badge--strong">{stageCopy.badge}</span>
              </div>

              <div
                className={
                  isReminderCapture
                    ? 'face-stage-card face-stage-card--capture face-stage-card--reminder'
                    : 'face-stage-card face-stage-card--capture'
                }
              >
                {renderFaceVisual(displayStage, {
                  showGuide: isCameraCapture || isOverviewCapture,
                  label: '내 얼굴 변화',
                })}

                <div className="face-stage-copy">
                  <p className="content-panel__eyebrow">Skin Stage</p>
                  <strong className="look-hero-card__title">{stageCopy.title}</strong>
                  <p className="helper-text">{stageCopy.body}</p>
                  <p className="helper-text helper-text--inverse">{displayCameraMessage}</p>

                  <div className="damage-meter">
                    <div className="damage-meter__track">
                      <div className="damage-meter__fill" style={{ width: `${stageCopy.level}%` }} />
                    </div>
                    <div className="damage-meter__labels">
                      <span>보호</span>
                      <span>붉어짐</span>
                      <span>탐</span>
                    </div>
                  </div>

                  {isCameraCapture ? (
                    <div className="capture-adjust-card">
                      <div className="capture-adjust-card__header">
                        <strong>얼굴 위치 맞추기</strong>
                        <span>촬영 후 바로 정렬</span>
                      </div>
                      <div className="capture-adjust-bar">
                        <span>얼굴 확대</span>
                        <div className="capture-adjust-bar__track">
                          <div className="capture-adjust-bar__fill capture-adjust-bar__fill--wide" />
                        </div>
                      </div>
                      <div className="capture-adjust-bar">
                        <span>얼굴 위아래 위치</span>
                        <div className="capture-adjust-bar__track">
                          <div className="capture-adjust-bar__fill capture-adjust-bar__fill--mid" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!isReminderCapture && (
                    <div className="face-preview-strip">
                      {([
                        ['fresh', '방금 바름'],
                        ['fading', '효과 약해짐'],
                        ['warning', '덧바를 시점'],
                        ['burned', '탄 상태'],
                      ] as const).map(([previewStage, label]) => (
                        <div
                          key={previewStage}
                          className={displayStage === previewStage ? 'face-preview face-preview--active' : 'face-preview'}
                        >
                          {renderFaceVisual(previewStage, { mini: true, label })}
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {isOverviewCapture && (
              <section className="submission-stat-grid">
                <div className={uvToneClass}>
                  <div className="uv-card__top">
                    <span className="hero-summary-pill__label">자외선</span>
                    <span className="uv-card__badge">{uvLevelCopy}</span>
                  </div>
                  <strong className="uv-card__value">Lv. {displayUv}</strong>
                  <div className="uv-scale">
                    <span
                      className={
                        displayUv <= 2 ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--low' : 'uv-scale__chip uv-scale__chip--low'
                      }
                    >
                      낮음
                    </span>
                    <span
                      className={
                        displayUv >= 3 && displayUv <= 5
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--medium'
                          : 'uv-scale__chip uv-scale__chip--medium'
                      }
                    >
                      보통
                    </span>
                    <span
                      className={
                        displayUv >= 6 && displayUv <= 7
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--high'
                          : 'uv-scale__chip uv-scale__chip--high'
                      }
                    >
                      높음
                    </span>
                    <span
                      className={
                        displayUv >= 8
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--very-high'
                          : 'uv-scale__chip uv-scale__chip--very-high'
                      }
                    >
                      매우 높음
                    </span>
                  </div>
                  <span className="hero-summary-pill__hint">0~2 · 3~5 · 6~7 · 8+</span>
                </div>
                <div className="submission-stat-card">
                  <span className="submission-stat-card__label">누적 노출 시간</span>
                  <strong>{displayExposure}분</strong>
                  <p>{displayTemperature}°C, 자외선 {displayUv} 단계에서는 얼굴 변화가 더 빨리 진행됩니다.</p>
                </div>
                <div className="submission-stat-card">
                  <span className="submission-stat-card__label">마지막 도포 시점</span>
                  <strong>{formattedLastAppliedAt}</strong>
                  <p>다시 바른 시각을 기준으로 다음 알림과 얼굴 상태를 계산합니다.</p>
                </div>
              </section>
            )}

            {isReminderCapture && (
              <section className="submission-reminder-grid">
                <div className="submission-stat-card submission-stat-card--strong">
                  <span className="submission-stat-card__label">마지막으로 선크림 바른 시점</span>
                  <strong>{formattedLastAppliedAt}</strong>
                  <p>앱을 종료해도 이 값은 유지되며, 다음 실행 시 그대로 불러옵니다.</p>
                </div>
                <div className="submission-stat-card">
                  <span className="submission-stat-card__label">다음 액션</span>
                  <strong>{nextAction}</strong>
                  <p>알림 동의와 userKey가 있으면 서버 예약으로도 이어질 수 있습니다.</p>
                </div>
                <div className="submission-stat-card">
                  <span className="submission-stat-card__label">알림 상태</span>
                  <strong>동의 완료</strong>
                  <p>기능성 메시지 발송을 위한 사용자 동의를 받은 상태를 보여줍니다.</p>
                </div>
              </section>
            )}
          </>
        )}

        {(isLandscapeCapture || isThumbnailCapture) && (
          <>
            <section className="submission-wide-hero">
              <div className="submission-wide-hero__copy">
                <p className="submission-hero__eyebrow">Summer Ping</p>
                <h2 className="submission-wide-hero__title">{captureScenario.headline}</h2>
                <p className="submission-wide-hero__description">{captureScenario.description}</p>
                <div className="submission-wide-hero__chips">
                  <span className="submission-chip submission-chip--strong">{nextAction}</span>
                  <span className="submission-chip">마지막 도포 {formattedLastAppliedAt}</span>
                </div>
                {!isThumbnailCapture && (
                  <div className="submission-wide-hero__metrics">
                    <div className="submission-mini-metric">
                      <span>현재 자외선</span>
                      <strong>Lv. {displayUv}</strong>
                    </div>
                    <div className="submission-mini-metric">
                      <span>누적 노출</span>
                      <strong>{displayExposure}분</strong>
                    </div>
                    <div className="submission-mini-metric">
                      <span>다음 확인</span>
                      <strong>{String(displayHour + 1).padStart(2, '0')}:00</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="submission-wide-hero__visual">
                <div className="submission-wide-face-card">
                  {renderFaceVisual(displayStage, { showGuide: true, label: '내 얼굴 변화' })}
                </div>
              </div>
            </section>

            <section className="submission-wide-grid">
              <div className="submission-surface submission-surface--compact">
                <div className="submission-surface__header">
                  <div>
                    <p className="content-panel__eyebrow">UV Guide</p>
                    <h3 className="content-panel__title">색으로 바로 이해하는 자외선 단계</h3>
                  </div>
                  <span className="status-badge">{uvLevelCopy}</span>
                </div>
                <div className={uvToneClass}>
                  <div className="uv-card__top">
                    <span className="hero-summary-pill__label">현재 단계</span>
                    <span className="uv-card__badge">0~2 · 3~5 · 6~7 · 8+</span>
                  </div>
                  <strong className="uv-card__value">Lv. {displayUv}</strong>
                  <div className="uv-scale">
                    <span
                      className={
                        displayUv <= 2 ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--low' : 'uv-scale__chip uv-scale__chip--low'
                      }
                    >
                      낮음
                    </span>
                    <span
                      className={
                        displayUv >= 3 && displayUv <= 5
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--medium'
                          : 'uv-scale__chip uv-scale__chip--medium'
                      }
                    >
                      보통
                    </span>
                    <span
                      className={
                        displayUv >= 6 && displayUv <= 7
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--high'
                          : 'uv-scale__chip uv-scale__chip--high'
                      }
                    >
                      높음
                    </span>
                    <span
                      className={
                        displayUv >= 8
                          ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--very-high'
                          : 'uv-scale__chip uv-scale__chip--very-high'
                      }
                    >
                      매우 높음
                    </span>
                  </div>
                </div>
              </div>

              <div className="submission-surface submission-surface--compact">
                <div className="submission-surface__header">
                  <div>
                    <p className="content-panel__eyebrow">Progression</p>
                    <h3 className="content-panel__title">얼굴 변화가 단계별로 이어져요</h3>
                  </div>
                </div>
                <div className="submission-preview-row">
                  {([
                    ['fresh', '방금 바름'],
                    ['fading', '효과 약해짐'],
                    ['warning', '덧바를 시점'],
                    ['burned', '탄 상태'],
                  ] as const).map(([previewStage, label]) => (
                    <div
                      key={previewStage}
                      className={displayStage === previewStage ? 'face-preview face-preview--active' : 'face-preview'}
                    >
                      {renderFaceVisual(previewStage, { mini: true, label })}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={isCaptureMode ? 'page-shell page-shell--capture' : 'page-shell'}>
      {!isCaptureMode && !hasStarted && (
        <section className="content-panel content-panel--primary">
          <div className="toolbar-row">
            <div>
              <p className="content-panel__eyebrow">Before You Start</p>
              <h3 className="content-panel__title">앱을 나간 뒤에도 알림 받을지 먼저 정해요</h3>
            </div>
            <span className="status-badge">
              {notificationAgreement === 'agreementRejected' ? '건너뜀' : '시작 전'}
            </span>
          </div>

          <div className="form-stack">
            <p className="helper-text">
              백그라운드 알림은 서비스 안에서 다시 묻지 않고, 시작 전에 한 번만 동의를 받습니다.
            </p>
            <p className="helper-text helper-text--tight">{notificationMessage}</p>
            <button type="button" className="primary-action primary-action--blue" onClick={requestNotificationOnboarding}>
              알림 동의하고 시작
            </button>
            <button type="button" className="primary-action" onClick={() => setHasStarted(true)}>
              알림 없이 시작
            </button>
          </div>
        </section>
      )}

      {(isCaptureMode || hasStarted) && (
        <>
      <section className="hero-section">
        <p className="eyebrow">Summer Ping</p>
        <h2 className="hero-title">선크림을 발라요</h2>
        <p className="hero-description">
          {userName ? `${userName}님, ` : ''}
          얼굴 상태 변화를 직접 보여줘서, 선크림을 제때 다시 바르는 습관을 만들도록 돕는 서비스입니다.
        </p>

        {!isCaptureMode && (
          <div className="hero-summary-row">
            <div className="hero-summary-pill">
              <span className="hero-summary-pill__label">현재 시간</span>
              <strong>{String(hour).padStart(2, '0')}:00</strong>
            </div>
            <div className={uvToneClass}>
              <div className="uv-card__top">
                <span className="hero-summary-pill__label">자외선</span>
                <span className="uv-card__badge">{uvLevelCopy}</span>
              </div>
              <strong className="uv-card__value">Lv. {uv}</strong>
              <div className="uv-scale">
                <span className={uv <= 2 ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--low' : 'uv-scale__chip uv-scale__chip--low'}>낮음</span>
                <span
                  className={
                    uv >= 3 && uv <= 5
                      ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--medium'
                      : 'uv-scale__chip uv-scale__chip--medium'
                  }
                >
                  보통
                </span>
                <span
                  className={
                    uv >= 6 && uv <= 7
                      ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--high'
                      : 'uv-scale__chip uv-scale__chip--high'
                  }
                >
                  높음
                </span>
                <span className={uv >= 8 ? 'uv-scale__chip uv-scale__chip--active uv-scale__chip--very-high' : 'uv-scale__chip uv-scale__chip--very-high'}>
                  매우 높음
                </span>
              </div>
              <span className="hero-summary-pill__hint">0~2 · 3~5 · 6~7 · 8+</span>
            </div>
            <div className="hero-summary-pill">
              <span className="hero-summary-pill__label">다음 행동</span>
              <strong>{nextAction}</strong>
            </div>
          </div>
        )}
      </section>

      {(isOverviewCapture || isThumbnailCapture || !isCaptureMode) && (
        <section className="content-panel content-panel--hero-reco">
          <div className="toolbar-row">
            <div>
              <p className="content-panel__eyebrow">Core Experience</p>
              <h3 className="content-panel__title">얼굴 이미지 변화</h3>
            </div>
            <span className="status-badge status-badge--strong">{stageCopy.badge}</span>
          </div>

              <div className="face-stage-card">
            {renderFaceVisual(displayStage, {
              showGuide: hasFaceImage,
              label: hasFaceImage ? '내 얼굴 변화' : undefined,
            })}

            <div className="face-stage-copy">
              <p className="content-panel__eyebrow">Skin Stage</p>
              <strong className="look-hero-card__title">{stageCopy.title}</strong>
              <p className="helper-text">{stageCopy.body}</p>
              {!isThumbnailCapture && <p className="helper-text helper-text--inverse">{cameraMessage}</p>}

              {!isThumbnailCapture && (
                <>
                  <div className="damage-meter">
                    <div className="damage-meter__track">
                      <div className="damage-meter__fill" style={{ width: `${stageCopy.level}%` }} />
                    </div>
                    <div className="damage-meter__labels">
                      <span>보호</span>
                      <span>붉어짐</span>
                      <span>탐</span>
                    </div>
                  </div>

                  {capturedImageUri ? (
                    <div className="face-adjust-panel face-adjust-panel--inline">
                      <div className="face-adjust-panel__header">
                        <strong>얼굴 위치 맞추기</strong>
                        <span>변화 화면을 보면서 바로 조절</span>
                      </div>

                      <label className="adjust-field">
                        <span className="field-label field-label--inverse">얼굴 확대</span>
                        <input
                          className="slider-input slider-input--light"
                          type="range"
                          min="0.9"
                          max="1.5"
                          step="0.05"
                          value={faceScale}
                          onChange={(event) => setFaceScale(Number(event.target.value))}
                        />
                      </label>

                      <label className="adjust-field">
                        <span className="field-label field-label--inverse">얼굴 위아래 위치</span>
                        <input
                          className="slider-input slider-input--light"
                          type="range"
                          min="-24"
                          max="24"
                          step="2"
                          value={faceOffsetY}
                          onChange={(event) => setFaceOffsetY(Number(event.target.value))}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="face-preview-strip">
                    {([
                      ['fresh', '방금 바름'],
                      ['fading', '효과 약해짐'],
                      ['warning', '덧바를 시점'],
                      ['burned', '탄 상태'],
                    ] as const).map(([previewStage, label]) => (
                      <div
                        key={previewStage}
                        className={stage === previewStage ? 'face-preview face-preview--active' : 'face-preview'}
                      >
                        {renderFaceVisual(previewStage, { mini: true, label })}
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <button type="button" className="primary-action" onClick={handlePrimaryAction}>
                    {stageCopy.button}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {!isCaptureMode && (
        <section className="content-panel content-panel--primary">
          <div className="toolbar-row">
            <div>
              <p className="content-panel__eyebrow">Camera</p>
              <h3 className="content-panel__title">내 얼굴 촬영하기</h3>
            </div>
            <span className="status-badge">{capturedImageUri ? '촬영 완료' : '촬영 필요'}</span>
          </div>

          <div className="camera-panel">
            <button type="button" className="primary-action primary-action--blue" onClick={handleOpenCamera}>
              {capturedImageUri ? '얼굴 다시 촬영하기' : '얼굴 촬영하기'}
            </button>
            <p className="helper-text">
              카메라로 얼굴을 촬영하면 바로 반영됩니다. 이후 선크림 상태에 따라 붉어짐과 탐 오버레이가
              이 얼굴 위에 덮입니다.
            </p>
          </div>

          <div className="form-stack">
            <label>
              <span className="field-label">마지막으로 선크림 바른 시점</span>
              <input
                className="select-field readonly-field"
                value={formattedLastAppliedAt}
                placeholder="아직 기록된 시점이 없어요"
                readOnly
              />
            </label>

            <label>
              <span className="field-label">지금 외출 길이</span>
              <select
                className="select-field"
                value={outdoorTime}
                onChange={(event) => setOutdoorTime(event.target.value as OutdoorTime)}
              >
                <option value="short">30분 이내</option>
                <option value="medium">1~2시간</option>
                <option value="long">2시간 이상</option>
              </select>
            </label>

            <label className="check-row">
              <input type="checkbox" checked={hasHat} onChange={(event) => setHasHat(event.target.checked)} />
              <span>모자나 양산으로 얼굴을 가리고 있어요</span>
            </label>
          </div>
        </section>
      )}

      {!isCaptureMode && (
        <section className="content-panel">
          <div className="toolbar-row">
            <div>
              <p className="content-panel__eyebrow">Reminder</p>
              <h3 className="content-panel__title">다음 선크림 타이밍</h3>
            </div>
            <span className="status-badge">{nextAction}</span>
          </div>

          <div className="summary-card">
              <strong className="summary-card__value">{adjustedExposure}분</strong>
              <p className="summary-card__text">
              현재 누적 노출 시간입니다. {temperature}°C, 자외선 {uv} 단계에서는 일정 시간만 지나도 얼굴
              변화가 빠르게 진행됩니다.
              </p>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  )
}
