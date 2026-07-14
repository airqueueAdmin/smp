import {
  OpenCameraPermissionError,
  getConsentedUserData,
  openCamera,
  requestNotificationAgreement,
} from '@apps-in-toss/web-framework'
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

type FaceRenderPreset = {
  baseWarmth: number
  redness: number
  tan: number
  freckles: number
  patches: number
  dryness: number
  shadow: number
  highlight: number
  saturation: number
  contrast: number
}

const LAST_APPLIED_AT_KEY = 'summer-ping:last-applied-at'
const LAST_APPLIED_AT_OWNER_KEY = 'summer-ping:last-applied-at-owner'
const NOTIFICATION_AGREEMENT_KEY = 'summer-ping:notification-agreement'
const USER_KEY_STORAGE_KEY = 'summer-ping:user-key'
const USER_NAME_STORAGE_KEY = 'summer-ping:user-name'
const ACCESS_TOKEN_STORAGE_KEY = 'summer-ping:access-token'
const NOTIFICATION_TEMPLATE_CODE = import.meta.env.VITE_SMART_MESSAGE_TEMPLATE_CODE
const USER_NAME_CONSENTED_DATA_KEY = import.meta.env.VITE_USER_NAME_CONSENTED_DATA_KEY
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

const FACE_RENDER_PRESETS: Record<SunscreenStage, FaceRenderPreset> = {
  fresh: {
    baseWarmth: 0.05,
    redness: 0.06,
    tan: 0.02,
    freckles: 0.02,
    patches: 0.01,
    dryness: 0.02,
    shadow: 0.04,
    highlight: 0.16,
    saturation: 1.02,
    contrast: 1.01,
  },
  fading: {
    baseWarmth: 0.1,
    redness: 0.18,
    tan: 0.08,
    freckles: 0.12,
    patches: 0.08,
    dryness: 0.12,
    shadow: 0.08,
    highlight: 0.11,
    saturation: 0.99,
    contrast: 1.02,
  },
  warning: {
    baseWarmth: 0.16,
    redness: 0.34,
    tan: 0.17,
    freckles: 0.3,
    patches: 0.24,
    dryness: 0.28,
    shadow: 0.14,
    highlight: 0.08,
    saturation: 0.95,
    contrast: 1.04,
  },
  burned: {
    baseWarmth: 0.24,
    redness: 0.4,
    tan: 0.28,
    freckles: 0.48,
    patches: 0.38,
    dryness: 0.42,
    shadow: 0.2,
    highlight: 0.05,
    saturation: 0.9,
    contrast: 1.07,
  },
}

function createSeededRandom(seed: number) {
  let current = seed >>> 0

  return () => {
    current = (current * 1664525 + 1013904223) >>> 0
    return current / 4294967296
  }
}

function getFaceSeed(src: string, stage: SunscreenStage) {
  let seed = 2166136261

  for (const character of `${stage}:${src}`) {
    seed ^= character.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }

  return seed >>> 0
}

function drawEllipsePath(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
) {
  context.beginPath()
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
  context.closePath()
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const offsetX = (width - drawWidth) / 2
  const offsetY = (height - drawHeight) / 2

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
}

function applyFaceRetouch(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stage: SunscreenStage,
  seed: number,
  mini: boolean,
) {
  const preset = FACE_RENDER_PRESETS[stage]
  const random = createSeededRandom(seed)
  const centerX = width * 0.5
  const centerY = height * 0.53
  const radiusX = width * 0.34
  const radiusY = height * 0.45
  const freckleCount = mini ? Math.round(26 * preset.freckles) : Math.round(120 * preset.freckles)
  const textureCount = mini ? Math.round(30 * preset.dryness) : Math.round(200 * preset.dryness)
  const patchCount = mini ? Math.max(1, Math.round(3 * preset.patches)) : Math.max(2, Math.round(9 * preset.patches))

  context.save()
  drawEllipsePath(context, centerX, centerY, radiusX, radiusY)
  context.clip()

  context.globalCompositeOperation = 'source-over'
  context.filter = 'none'

  if (preset.baseWarmth > 0) {
    const warmthGradient = context.createLinearGradient(0, 0, 0, height)
    warmthGradient.addColorStop(0, `rgba(255, 219, 191, ${0.36 * preset.baseWarmth})`)
    warmthGradient.addColorStop(0.55, `rgba(233, 150, 98, ${0.48 * preset.baseWarmth})`)
    warmthGradient.addColorStop(1, `rgba(139, 80, 47, ${0.62 * preset.baseWarmth})`)
    context.fillStyle = warmthGradient
    context.fillRect(0, 0, width, height)
  }

  context.globalCompositeOperation = 'multiply'

  if (preset.tan > 0) {
    const tanGradient = context.createRadialGradient(centerX, centerY + height * 0.06, width * 0.08, centerX, centerY, width * 0.42)
    tanGradient.addColorStop(0, `rgba(173, 111, 69, ${0.22 * preset.tan})`)
    tanGradient.addColorStop(0.7, `rgba(126, 73, 42, ${0.42 * preset.tan})`)
    tanGradient.addColorStop(1, `rgba(76, 40, 23, ${0.5 * preset.tan})`)
    context.fillStyle = tanGradient
    context.fillRect(0, 0, width, height)
  }

  if (preset.redness > 0) {
    const cheekAlpha = 0.42 * preset.redness
    const cheekRadius = radiusX * 0.38
    const drawCheek = (x: number, y: number, alpha: number) => {
      const gradient = context.createRadialGradient(x, y, width * 0.02, x, y, cheekRadius)
      gradient.addColorStop(0, `rgba(210, 52, 52, ${alpha})`)
      gradient.addColorStop(0.6, `rgba(201, 71, 58, ${alpha * 0.6})`)
      gradient.addColorStop(1, 'rgba(201, 71, 58, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)
    }

    drawCheek(centerX - radiusX * 0.62, centerY + radiusY * 0.12, cheekAlpha)
    drawCheek(centerX + radiusX * 0.62, centerY + radiusY * 0.12, cheekAlpha * 0.96)
    drawCheek(centerX, centerY - radiusY * 0.02, cheekAlpha * 0.38)
  }

  if (preset.freckles > 0) {
    context.fillStyle = `rgba(102, 58, 34, ${0.38 * preset.freckles})`

    for (let index = 0; index < freckleCount; index += 1) {
      const angle = random() * Math.PI * 2
      const radialDistance = Math.sqrt(random())
      const x = centerX + Math.cos(angle) * radiusX * radialDistance * 0.96
      const y = centerY + Math.sin(angle) * radiusY * radialDistance * 0.9

      if (y > centerY + radiusY * 0.44) {
        continue
      }

      const radius = mini ? 0.5 + random() * 0.55 : 0.8 + random() * 1.6
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  if (preset.patches > 0) {
    context.filter = mini ? 'blur(2px)' : 'blur(7px)'

    for (let index = 0; index < patchCount; index += 1) {
      const angle = random() * Math.PI * 2
      const radialDistance = 0.18 + random() * 0.7
      const x = centerX + Math.cos(angle) * radiusX * radialDistance
      const y = centerY + Math.sin(angle) * radiusY * radialDistance * 0.88
      const patchRadius = (mini ? width * 0.04 : width * 0.065) + random() * width * (mini ? 0.02 : 0.05)
      const patchGradient = context.createRadialGradient(x, y, patchRadius * 0.15, x, y, patchRadius)
      const alpha = (0.14 + random() * 0.2) * preset.patches
      patchGradient.addColorStop(0, `rgba(118, 65, 38, ${alpha})`)
      patchGradient.addColorStop(1, 'rgba(118, 65, 38, 0)')
      context.fillStyle = patchGradient
      context.fillRect(0, 0, width, height)
    }
  }

  if (preset.dryness > 0) {
    context.filter = 'none'
    context.strokeStyle = `rgba(88, 52, 33, ${0.18 * preset.dryness})`
    context.lineWidth = mini ? 0.35 : 0.55

    for (let index = 0; index < textureCount; index += 1) {
      const angle = random() * Math.PI * 2
      const radialDistance = Math.sqrt(random()) * 0.95
      const x = centerX + Math.cos(angle) * radiusX * radialDistance
      const y = centerY + Math.sin(angle) * radiusY * radialDistance
      const length = (mini ? 0.8 : 1.6) + random() * (mini ? 0.7 : 2.2)
      const direction = random() * Math.PI
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + Math.cos(direction) * length, y + Math.sin(direction) * length)
      context.stroke()
    }
  }

  if (preset.shadow > 0) {
    context.filter = 'none'
    const edgeShadow = context.createLinearGradient(0, 0, 0, height)
    edgeShadow.addColorStop(0, 'rgba(77, 41, 22, 0)')
    edgeShadow.addColorStop(0.72, `rgba(82, 43, 25, ${0.12 * preset.shadow})`)
    edgeShadow.addColorStop(1, `rgba(51, 28, 17, ${0.46 * preset.shadow})`)
    context.fillStyle = edgeShadow
    context.fillRect(0, 0, width, height)
  }

  context.globalCompositeOperation = 'screen'

  if (preset.highlight > 0) {
    const highlight = context.createRadialGradient(centerX, centerY - radiusY * 0.8, width * 0.02, centerX, centerY - radiusY * 0.75, radiusX * 0.8)
    highlight.addColorStop(0, `rgba(255, 250, 242, ${0.42 * preset.highlight})`)
    highlight.addColorStop(0.65, `rgba(255, 246, 233, ${0.16 * preset.highlight})`)
    highlight.addColorStop(1, 'rgba(255, 246, 233, 0)')
    context.fillStyle = highlight
    context.fillRect(0, 0, width, height)
  }

  context.restore()
}

function applyColorFinish(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stage: SunscreenStage,
) {
  const preset = FACE_RENDER_PRESETS[stage]

  if (stage === 'fresh') {
    return
  }

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempContext = tempCanvas.getContext('2d')

  if (!tempContext) {
    return
  }

  tempContext.drawImage(context.canvas, 0, 0)
  context.clearRect(0, 0, width, height)
  context.filter = `saturate(${preset.saturation}) contrast(${preset.contrast})`
  context.drawImage(tempCanvas, 0, 0)
  context.filter = 'none'
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = stage === 'burned' ? 'rgba(96, 58, 34, 0.06)' : 'rgba(122, 72, 42, 0.025)'
  context.fillRect(0, 0, width, height)
}

function FaceRetouchCanvas({
  alt,
  mini = false,
  src,
  stage,
}: {
  alt: string
  mini?: boolean
  src: string
  stage: SunscreenStage
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    let cancelled = false
    const image = new Image()
    const width = mini ? 104 : 320
    const height = mini ? 128 : 380

    image.decoding = 'async'
    image.onload = () => {
      if (cancelled) {
        return
      }

      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      canvas.width = width
      canvas.height = height
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = true
      drawCoverImage(context, image, width, height)
      applyFaceRetouch(context, width, height, stage, getFaceSeed(src, stage), mini)
      applyColorFinish(context, width, height, stage)
    }
    image.src = src

    return () => {
      cancelled = true
    }
  }, [mini, src, stage])

  return <canvas ref={canvasRef} className="face-visual__canvas" role="img" aria-label={alt} />
}

function FaceAlignmentGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'face-alignment-guide face-alignment-guide--compact' : 'face-alignment-guide'} aria-hidden="true">
      <div className="face-alignment-guide__oval" />
      <div className="face-alignment-guide__line face-alignment-guide__line--eyes" />
      <div className="face-alignment-guide__line face-alignment-guide__line--nose" />
      <div className="face-alignment-guide__line face-alignment-guide__line--chin" />
      <span className="face-alignment-guide__mark face-alignment-guide__mark--left-eye" />
      <span className="face-alignment-guide__mark face-alignment-guide__mark--right-eye" />
    </div>
  )
}

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
        headline: '촬영 중 얼굴을 가이드에 맞춰요',
        description: '촬영 화면에 격자와 얼굴 윤곽을 함께 띄워 얼굴이 결과 카드에 바로 맞게 들어오도록 했습니다.',
        cameraMessage: '촬영 중에는 격자와 타원 가이드에 맞추고, 촬영 후 필요할 때만 위치를 미세 조정합니다.',
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
        headline: '얼굴 변화로 덧바를 타이밍을 확인해요',
        description: '촬영한 얼굴과 자외선 변화를 함께 보여줘, 다시 발라야 할 순간을 바로 이해할 수 있는 선케어 서비스입니다.',
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
        headline: '얼굴 변화로 덧바를 타이밍을 확인해요',
        description: '실제 얼굴 변화로 다시 발라야 할 순간을 알려주는 썸머핑',
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
      button: '피부 보호 중',
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

function getPendingApplicationCopy() {
  return {
    badge: '기록 필요',
    title: '선크림을 바른 직후 시간을 먼저 기록해 주세요.',
    body: '얼굴 촬영 후 선크림을 바르면, 그 시각을 기준으로 다음 덧바르기 타이밍과 피부 변화를 계산합니다.',
    button: '지금 선크림 바르기',
    level: 8,
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

function getUserInfoErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return ''
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : ''
}

export function HomePage() {
  const [searchParams] = useSearchParams()
  const [lastAppliedAt, setLastAppliedAt] = useState('')
  const [outdoorTime, setOutdoorTime] = useState<OutdoorTime>('medium')
  const [hasHat, setHasHat] = useState(false)
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null)
  const [faceScale, setFaceScale] = useState(1)
  const [faceOffsetY, setFaceOffsetY] = useState(0)
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false)
  const [isCameraStreamReady, setIsCameraStreamReady] = useState(false)
  const [isNativeCameraFallbackVisible, setIsNativeCameraFallbackVisible] = useState(false)
  const [cameraPreviewImageUri, setCameraPreviewImageUri] = useState<string | null>(null)
  const [cameraCaptureRetryKey, setCameraCaptureRetryKey] = useState(0)
  const [cameraCaptureMessage, setCameraCaptureMessage] = useState('얼굴 윤곽을 가이드에 맞춘 뒤 촬영해 주세요.')
  const [cameraMessage, setCameraMessage] = useState('아직 촬영한 얼굴 이미지가 없어요.')
  const [notificationAgreement, setNotificationAgreement] = useState(() => getInitialNotificationAgreement())
  const [userKey, setUserKey] = useState(() => getInitialUserKey())
  const [userName, setUserName] = useState(() => getInitialUserName())
  const [isUserNameRequestPending, setIsUserNameRequestPending] = useState(false)
  const [userNameStatus, setUserNameStatus] = useState<
    'idle' | 'decrypted' | 'missing_key' | 'failed' | 'not_provided' | 'not_configured' | 'declined' | 'unavailable' | 'timeout'
  >(() => (getInitialUserName() ? 'decrypted' : 'idle'))
  const [notificationMessage, setNotificationMessage] = useState(
    '앱을 나가도 알림을 받으려면 먼저 알림 동의를 받아야 해요.',
  )
  const capture = searchParams.get('capture')
  const [accessToken] = useState(() => getInitialAccessToken(searchParams))
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
  const isAwaitingFirstApplication = !captureScenario && !lastAppliedAt
  const stageCopy = useMemo(
    () => (isAwaitingFirstApplication ? getPendingApplicationCopy() : getStageCopy(displayStage)),
    [displayStage, isAwaitingFirstApplication],
  )
  const nextAction = captureScenario?.nextAction ?? (
    isAwaitingFirstApplication ? '지금 선크림 바른 시간 기록' : getNextAction(displayStage, displayHour)
  )
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
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  function releaseCameraCapture(video = cameraVideoRef.current, stream = cameraStreamRef.current) {
    stream?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null

    if (video) {
      video.pause()
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
    }
  }

  function stopCameraCapture() {
    releaseCameraCapture()
    setIsCameraStreamReady(false)
  }

  function createCameraFrameImage(video: HTMLVideoElement) {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null
    }

    const targetAspectRatio = 3 / 4
    const videoAspectRatio = video.videoWidth / video.videoHeight
    const sourceWidth = videoAspectRatio > targetAspectRatio ? video.videoHeight * targetAspectRatio : video.videoWidth
    const sourceHeight = videoAspectRatio > targetAspectRatio ? video.videoHeight : video.videoWidth / targetAspectRatio
    const sourceX = (video.videoWidth - sourceWidth) / 2
    const sourceY = (video.videoHeight - sourceHeight) / 2
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    canvas.width = 720
    canvas.height = 960
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.92)
  }

  useEffect(() => {
    if (!userKey) {
      return
    }

    window.localStorage.setItem(USER_KEY_STORAGE_KEY, userKey)
  }, [userKey])

  useEffect(() => {
    if (isCaptureMode || !userKey) {
      return
    }

    const storedLastAppliedAt = window.localStorage.getItem(LAST_APPLIED_AT_KEY)
    const storedOwnerKey = window.localStorage.getItem(LAST_APPLIED_AT_OWNER_KEY)

    if (lastAppliedAt) {
      window.localStorage.setItem(LAST_APPLIED_AT_KEY, lastAppliedAt)
      window.localStorage.setItem(LAST_APPLIED_AT_OWNER_KEY, userKey)
      return
    }

    if (storedLastAppliedAt && storedOwnerKey === userKey) {
      setLastAppliedAt(storedLastAppliedAt)
      return
    }

    if (storedLastAppliedAt && storedOwnerKey !== userKey) {
      window.localStorage.removeItem(LAST_APPLIED_AT_KEY)
      window.localStorage.removeItem(LAST_APPLIED_AT_OWNER_KEY)
    }
  }, [isCaptureMode, lastAppliedAt, userKey])

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
    if (isCaptureMode || !accessToken || (userKey && userName)) {
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
        const nextUserNameStatus =
          nextUserName
            ? 'decrypted'
            : result.user.hasEncryptedName
              ? result.user.decryptionStatus === 'failed'
                ? 'failed'
                : 'missing_key'
              : 'not_provided'
        setUserKey(nextUserKey)
        setUserNameStatus(nextUserNameStatus)
        if (nextUserName) {
          setUserName(nextUserName)
        }
        setNotificationMessage('알림 발송에 필요한 사용자 정보를 연결했어요.')
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        setUserNameStatus('failed')
        setNotificationMessage(error instanceof Error ? error.message : 'userKey 조회에 실패했어요.')
      })

    return () => controller.abort()
  }, [accessToken, isCaptureMode, userKey, userName])

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
          setHasStarted(true)
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

  useEffect(() => {
    if (isCaptureMode || hasStarted || hasNotificationAgreement || !NOTIFICATION_TEMPLATE_CODE) {
      return
    }

    return requestNotificationOnboarding()
  }, [hasNotificationAgreement, hasStarted, isCaptureMode])

  useEffect(() => {
    if (!isCameraCaptureOpen) {
      return
    }

    let cancelled = false

    async function startCameraCapture() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraCaptureMessage('앱 안 촬영 화면을 열 수 없어 기본 카메라로 촬영해 주세요.')
        setIsCameraStreamReady(false)
        setIsNativeCameraFallbackVisible(true)
        return
      }

      try {
        setIsCameraStreamReady(false)
        setIsNativeCameraFallbackVisible(false)
        setCameraPreviewImageUri(null)
        setCameraCaptureMessage('카메라를 준비하고 있어요.')

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 720 },
            height: { ideal: 960 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        cameraStreamRef.current = stream

        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play()
        }

        setCameraCaptureMessage('얼굴 윤곽을 타원 안에 맞추고, 눈은 가로선에 맞춘 뒤 셔터를 눌러 주세요.')
        setIsCameraStreamReady(true)
      } catch (error) {
        console.error('앱 안 촬영 화면을 여는 데 실패했어요:', error)
        stopCameraCapture()
        setIsNativeCameraFallbackVisible(true)
        setCameraCaptureMessage('앱 안 촬영 화면을 열 수 없어 기본 카메라로 촬영해 주세요.')
      }
    }

    startCameraCapture()

    return () => {
      cancelled = true
      stopCameraCapture()
    }
  }, [cameraCaptureRetryKey, isCameraCaptureOpen])

  async function requestUserNameFromConsentedData() {
    if (userName) {
      return { userName, status: 'decrypted' as const }
    }

    if (!USER_NAME_CONSENTED_DATA_KEY) {
      setUserNameStatus('not_configured')
      return { userName: '', status: 'not_configured' as const }
    }

    try {
      setIsUserNameRequestPending(true)
      setCameraMessage('이름 정보 제공 동의 여부를 확인하고 있어요.')
      const data = await Promise.race([
        getConsentedUserData({
          consentedUserDataKey: USER_NAME_CONSENTED_DATA_KEY,
          shouldRequestAgreementWhenUserDeclined: true,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject({ code: 'TIMEOUT' })
          }, 8000)
        }),
      ])
      const nextUserName = typeof data?.USER_NAME === 'string' ? data.USER_NAME.trim() : ''

      if (nextUserName) {
        setUserName(nextUserName)
        setUserNameStatus('decrypted')
        return { userName: nextUserName, status: 'decrypted' as const }
      }

      setUserNameStatus('not_provided')
      return { userName: '', status: 'not_provided' as const }
    } catch (error) {
      const code = getUserInfoErrorCode(error)

      if (code === 'TIMEOUT') {
        setUserNameStatus('timeout')
        return { userName: '', status: 'timeout' as const }
      }

      if (code === 'USER_DECLINED' || code === 'CANCELED') {
        setUserNameStatus('declined')
        return { userName: '', status: 'declined' as const }
      }

      if (code === 'TERMS_NOT_SET' || code === 'INVALID_REQUEST') {
        setUserNameStatus('not_configured')
        return { userName: '', status: 'not_configured' as const }
      }

      if (code === 'UNAVAILABLE') {
        setUserNameStatus('unavailable')
        return { userName: '', status: 'unavailable' as const }
      }

      console.error('사용자 이름 불러오기에 실패했어요:', error)
      setUserNameStatus('failed')
      return { userName: '', status: 'failed' as const }
    } finally {
      setIsUserNameRequestPending(false)
    }
  }

  function applyCapturedFaceImage(imageUri: string, successMessage: string) {
    setCapturedImageUri(imageUri)
    setFaceScale(1)
    setFaceOffsetY(0)
    setCameraMessage(
      lastAppliedAt
        ? `${successMessage} 이제 단계별 피부 변화가 이 얼굴 위에 반영됩니다.`
        : `${successMessage} 이제 선크림을 바른 직후 버튼을 눌러 시간을 기록해 주세요.`,
    )
  }

  async function ensureUserNameForFaceCapture() {
    if (userName) {
      return true
    }

    const result = await requestUserNameFromConsentedData()

    if (result.userName) {
      return true
    }

    if (result.status === 'declined') {
      setCameraMessage('이름 정보 제공에 동의해야 얼굴 등록을 진행할 수 있어요.')
    } else if (result.status === 'not_configured') {
      setCameraMessage('이름 정보 동의 설정이 아직 연결되지 않아 얼굴 등록을 진행할 수 없어요.')
    } else if (result.status === 'unavailable') {
      setCameraMessage('지금은 토스에서 이름 정보를 불러올 수 없어 얼굴 등록을 진행할 수 없어요.')
    } else if (result.status === 'timeout') {
      setCameraMessage('이름 정보 동의 화면 응답이 지연되고 있어요. 다시 시도해 주세요.')
    } else if (result.status === 'failed') {
      setCameraMessage('이름 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } else {
      setCameraMessage('이름 정보를 확인한 뒤 얼굴 등록을 진행해 주세요.')
    }

    return false
  }

  async function handleOpenCamera() {
    const canOpenCapture = await ensureUserNameForFaceCapture()

    if (!canOpenCapture) {
      return
    }

    setCameraPreviewImageUri(null)
    setCameraCaptureMessage('카메라를 준비하고 있어요.')
    setIsNativeCameraFallbackVisible(false)
    setIsCameraCaptureOpen(true)
  }

  function handleCloseCameraCapture() {
    const video = cameraVideoRef.current
    const stream = cameraStreamRef.current

    flushSync(() => {
      setIsCameraCaptureOpen(false)
      setIsCameraStreamReady(false)
      setIsNativeCameraFallbackVisible(false)
      setCameraPreviewImageUri(null)
      setCameraCaptureMessage('얼굴 윤곽을 가이드에 맞춘 뒤 촬영해 주세요.')
    })

    releaseCameraCapture(video, stream)
  }

  function handleCameraShutter() {
    const video = cameraVideoRef.current
    const imageUri = video ? createCameraFrameImage(video) : null

    if (!imageUri) {
      setCameraCaptureMessage('카메라 화면이 준비된 뒤 촬영해 주세요.')
      return
    }

    try {
      setCameraPreviewImageUri(imageUri)
      setCameraCaptureMessage('촬영 완료. 가이드에 맞는지 확인한 뒤 이 사진을 사용해 주세요.')
    } catch (error) {
      console.error('가이드 촬영에 실패했어요:', error)
      setCameraCaptureMessage('촬영에 실패했어요. 다시 시도하거나 기본 카메라로 촬영해 주세요.')
      setIsNativeCameraFallbackVisible(true)
    }
  }

  function handleUseCameraPreview() {
    if (!cameraPreviewImageUri) {
      setCameraCaptureMessage('사용할 촬영 화면이 아직 없어요.')
      return
    }

    applyCapturedFaceImage(cameraPreviewImageUri, '가이드에 맞춰 촬영한 얼굴 이미지를 적용했어요.')
    handleCloseCameraCapture()
  }

  function handleRetakeCameraPreview() {
    setCameraPreviewImageUri(null)
    setIsNativeCameraFallbackVisible(false)

    if (cameraStreamRef.current && cameraVideoRef.current?.srcObject) {
      setIsCameraStreamReady(true)
      setCameraCaptureMessage('얼굴 윤곽을 타원 안에 맞추고, 눈은 가로선에 맞춘 뒤 셔터를 눌러 주세요.')
      return
    }

    setIsCameraStreamReady(false)
    setCameraCaptureMessage('카메라를 다시 준비하고 있어요.')
    setCameraCaptureRetryKey((current) => current + 1)
  }

  async function captureFaceImage() {
    try {
      setCameraCaptureMessage('기본 카메라를 열고 있어요.')
      setCameraMessage('기본 카메라를 열고 있어요.')

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
      applyCapturedFaceImage(imageUri, '촬영한 얼굴 이미지를 적용했어요.')
      handleCloseCameraCapture()
    } catch (error) {
      if (error instanceof OpenCameraPermissionError) {
        setCameraCaptureMessage('카메라 권한이 거부되었어요. 권한 허용 후 다시 촬영해 주세요.')
        setCameraMessage('카메라 권한이 거부되었어요. 권한 허용 후 다시 촬영해 주세요.')
        return
      }

      console.error('사진을 가져오는 데 실패했어요:', error)
      setCameraCaptureMessage('기본 카메라 촬영에 실패했어요. 다시 시도해 주세요.')
      setCameraMessage('얼굴 촬영에 실패했어요. 토스 앱 환경에서 다시 시도해 주세요.')
    }
  }

  function handlePrimaryAction() {
    if (!lastAppliedAt) {
      const nextAppliedAt = new Date().toISOString()
      window.localStorage.setItem(LAST_APPLIED_AT_KEY, nextAppliedAt)
      if (userKey) {
        window.localStorage.setItem(LAST_APPLIED_AT_OWNER_KEY, userKey)
      }
      setLastAppliedAt(nextAppliedAt)
      setCameraMessage('선크림을 바른 시간을 기록했어요. 이제 이 시각을 기준으로 다음 덧바르기 타이밍을 계산합니다.')
      return
    }

    if (stage === 'fresh') {
      setCameraMessage('지금은 보호 상태예요. 다음 확인 시간에 다시 보면 됩니다.')
      return
    }

    const nextAppliedAt = new Date().toISOString()
    window.localStorage.setItem(LAST_APPLIED_AT_KEY, nextAppliedAt)
    if (userKey) {
      window.localStorage.setItem(LAST_APPLIED_AT_OWNER_KEY, userKey)
    }
    setLastAppliedAt(nextAppliedAt)
    setCameraMessage('선크림을 다시 발랐어요. 얼굴 상태를 바로 안전 단계로 되돌렸습니다.')
  }

  function renderFaceVisual(
    visualStage: SunscreenStage,
    options?: { mini?: boolean; showGuide?: boolean; label?: string; userName?: string },
  ) {
    const mini = options?.mini ?? false
    const subjectClassName = mini ? 'face-visual__subject face-visual__subject--mini' : 'face-visual__subject'
    const subjectStyle = mini ? displayFaceImageMiniStyle : displayFaceImageStyle

    return (
      <div className={getFaceToneClass(visualStage)}>
        {!mini && options?.userName ? <span className="face-visual__name">{options.userName}님</span> : null}
        <div className={subjectClassName} style={hasFaceImage ? subjectStyle : undefined}>
          {hasFaceImage ? (
            <FaceRetouchCanvas
              alt={options?.label ?? '얼굴 상태'}
              mini={mini}
              src={displayFaceImageUri ?? ''}
              stage={visualStage}
            />
          ) : (
            <div className="face-visual__head" />
          )}
        </div>
        {!mini && options?.showGuide && hasFaceImage ? (
          <div className="face-visual__guide">
            <FaceAlignmentGuide compact />
          </div>
        ) : null}
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
                  <p className="submission-hero__eyebrow">썸머핑</p>
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
                  <p>알림 동의를 완료하면 예약 시각에 스마트 메시지로 다시 알려줄 수 있어요.</p>
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
                <p className="submission-hero__eyebrow">썸머핑</p>
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
      {isCameraCaptureOpen && (
        <div className="camera-capture-view" role="dialog" aria-modal="true" aria-label="얼굴 촬영">
          <div className="camera-capture-view__top">
            <div>
              <p className="camera-capture-view__eyebrow">Face Capture</p>
              <h3 className="camera-capture-view__title">{cameraPreviewImageUri ? '촬영 확인' : '가이드에 맞춰 촬영'}</h3>
            </div>
            <button
              type="button"
              className="camera-capture-view__close"
              aria-label="촬영 화면 닫기"
              onClick={handleCloseCameraCapture}
            >
              ×
            </button>
          </div>

          <div className="camera-capture-view__body">
            <div className={cameraPreviewImageUri ? 'camera-capture-preview camera-capture-preview--frozen' : 'camera-capture-preview'}>
              <video ref={cameraVideoRef} className="camera-capture-preview__video" autoPlay muted playsInline />
              {cameraPreviewImageUri ? (
                <img className="camera-capture-preview__image" src={cameraPreviewImageUri} alt="촬영 정지 화면" />
              ) : null}
              <span className="camera-capture-preview__grid" aria-hidden="true" />
              <FaceAlignmentGuide />
              {!isCameraStreamReady && !cameraPreviewImageUri && <div className="camera-capture-preview__status">{cameraCaptureMessage}</div>}
              {cameraPreviewImageUri ? <div className="camera-capture-preview__captured-badge">촬영 완료</div> : null}
            </div>
            <p className="camera-capture-view__hint">{cameraCaptureMessage}</p>
          </div>

          <div className="camera-capture-view__actions">
            {cameraPreviewImageUri ? (
              <div className="camera-capture-view__confirm-actions">
                <button type="button" className="camera-capture-view__secondary-action" onClick={handleRetakeCameraPreview}>
                  다시 촬영
                </button>
                <button type="button" className="camera-capture-view__primary-action" onClick={handleUseCameraPreview}>
                  이 사진 사용
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="camera-capture-view__shutter"
                aria-label="촬영"
                onClick={handleCameraShutter}
                disabled={!isCameraStreamReady}
              />
            )}
            {isNativeCameraFallbackVisible && !cameraPreviewImageUri && (
              <button type="button" className="camera-capture-view__fallback" onClick={captureFaceImage}>
                기본 카메라
              </button>
            )}
          </div>
        </div>
      )}

      {!isCaptureMode && !hasStarted && (
        <section className="content-panel content-panel--primary">
          <div className="toolbar-row">
            <div>
              <p className="content-panel__eyebrow">Notification</p>
              <h3 className="content-panel__title">알림 동의 확인이 필요해요</h3>
            </div>
            <span className="status-badge">{notificationAgreement === 'agreementRejected' ? '거부됨' : '재시도'}</span>
          </div>

          <div className="form-stack">
            <p className="helper-text">
              앱 실행 직후 알림 동의 화면을 자동으로 요청합니다. 화면이 보이지 않았거나 실패했다면 여기서 다시 시도할 수 있어요.
            </p>
            <p className="helper-text helper-text--tight">{notificationMessage}</p>
            <button type="button" className="primary-action primary-action--blue" onClick={requestNotificationOnboarding}>
              알림 동의 다시 요청
            </button>
            <button type="button" className="primary-action" onClick={() => setHasStarted(true)}>
              알림 없이 계속
            </button>
          </div>
        </section>
      )}

      {(isCaptureMode || hasStarted) && (
        <>
      <section className="hero-section">
        <p className="eyebrow">썸머핑</p>
        <h2 className="hero-title">얼굴 변화로 덧바를 타이밍을 확인해요</h2>
        <p className="hero-description">
          {userName ? `${userName}님, ` : ''}
          촬영한 얼굴과 현재 자외선 환경을 함께 반영해, 지금 선케어가 필요한 순간을 직관적으로 보여드립니다.
        </p>
            {!userName && userNameStatus !== 'idle' && (
          <p className="helper-text helper-text--tight">
            {userNameStatus === 'missing_key' && '이름 암호문은 받았지만 서버 복호화 키 설정을 아직 읽지 못했어요.'}
            {userNameStatus === 'failed' && '이름 암호문은 받았지만 복호화에 실패했어요. 서버 키나 AAD 설정을 확인해 주세요.'}
            {userNameStatus === 'not_provided' && '현재 로그인 응답에는 이름 정보가 포함되지 않았어요.'}
            {userNameStatus === 'not_configured' && '사용자 정보 불러오기 설정이나 이름용 cud 키가 아직 연결되지 않았어요.'}
            {userNameStatus === 'declined' && '이름 정보 제공 동의가 완료되지 않아 이름을 표시하지 못하고 있어요.'}
            {userNameStatus === 'unavailable' && '지금은 토스에서 사용자 이름 정보를 불러올 수 없는 상태예요.'}
            {userNameStatus === 'timeout' && '이름 정보 동의 화면 응답이 지연되고 있어요. 다시 시도해 주세요.'}
          </p>
        )}

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
              userName,
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
            <div className="face-capture-guide-card">
              <div className="face-capture-guide-card__preview">
                <FaceAlignmentGuide />
              </div>
              <div>
                <strong>촬영 중 얼굴 기준선</strong>
                <p>카메라 화면에 격자와 얼굴 윤곽을 띄워 눈, 중앙, 턱 위치를 맞춘 뒤 촬영해요.</p>
              </div>
            </div>

            <button
              type="button"
              className="primary-action primary-action--blue"
              onClick={handleOpenCamera}
              disabled={isUserNameRequestPending}
            >
              {isUserNameRequestPending
                ? '이름 정보 확인 중...'
                : capturedImageUri
                  ? '가이드 보고 다시 촬영하기'
                  : '가이드 보고 촬영하기'}
            </button>
            <p className="helper-text">
              촬영 화면 안에서 격자와 얼굴 윤곽을 먼저 맞춥니다. 촬영 후에는 선크림 상태에 따라 붉어짐과 피부변화가
              이 얼굴 위에 덮이고, 위치를 한 번 더 조절할 수 있어요.
            </p>
            {!userName && (
              <p className="helper-text helper-text--tight">
                얼굴을 처음 등록하는 시점에 이름 정보 제공 동의가 함께 노출될 수 있어요.
              </p>
            )}
            {isUserNameRequestPending && (
              <p className="helper-text helper-text--tight">
                토스 동의 화면이나 응답을 기다리는 중이에요. 8초 이상 반응이 없으면 다시 눌러 주세요.
              </p>
            )}
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
