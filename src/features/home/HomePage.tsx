import {
  FetchAlbumPhotosPermissionError,
  OpenCameraPermissionError,
  fetchAlbumPhotos,
  openCamera,
} from '@apps-in-toss/web-framework'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AD_GROUP_IDS, useFullScreenAd } from '../../lib/ads'
import { trackEvent, trackScreen } from '../../lib/analytics'
import {
  createFaceReading,
  getFaceReadingHistory,
  saveFaceReading,
} from '../face-reading/storage'

type HomeStep = 'home' | 'guide' | 'review'

export const DEMO_FACE_IMAGE_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EBD8C8"/>
        <stop offset="100%" stop-color="#C9A98E"/>
      </linearGradient>
      <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#F3C7A9"/>
        <stop offset="100%" stop-color="#DFA27F"/>
      </linearGradient>
      <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#332722"/>
        <stop offset="100%" stop-color="#171210"/>
      </linearGradient>
    </defs>
    <rect width="420" height="560" fill="url(#bg)"/>
    <circle cx="330" cy="96" r="72" fill="#F6EEE6" opacity=".38"/>
    <circle cx="72" cy="470" r="96" fill="#AD8066" opacity=".14"/>
    <path d="M82 560c14-114 63-165 129-165 69 0 118 51 131 165z" fill="#44302A"/>
    <ellipse cx="211" cy="282" rx="124" ry="158" fill="url(#skin)"/>
    <path d="M91 252c-1-123 66-191 151-178 62 9 101 58 104 124-32-10-60-35-76-70-34 64-96 100-179 124z" fill="url(#hair)"/>
    <path d="M91 238c-16 36-15 80 4 118l18-18-2-101z" fill="#251B18"/>
    <path d="M326 202c25 50 20 112-6 158l-13-25 1-118z" fill="#251B18"/>
    <path d="M141 264c20-11 39-11 58 0" fill="none" stroke="#6B4638" stroke-width="7" stroke-linecap="round"/>
    <path d="M224 264c20-11 39-11 58 0" fill="none" stroke="#6B4638" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="171" cy="282" rx="13" ry="9" fill="#2D211D"/>
    <ellipse cx="254" cy="282" rx="13" ry="9" fill="#2D211D"/>
    <path d="M210 291c-4 23-9 45-4 58 6 6 15 7 24 2" fill="none" stroke="#B9785D" stroke-width="7" stroke-linecap="round"/>
    <path d="M169 385c26 17 59 18 87-1" fill="none" stroke="#9D554D" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="148" cy="334" rx="29" ry="16" fill="#DF8F79" opacity=".25"/>
    <ellipse cx="276" cy="334" rx="29" ry="16" fill="#DF8F79" opacity=".25"/>
  </svg>
`)}` as const

function FaceSymbol() {
  return (
    <svg className="face-symbol" viewBox="0 0 240 270" aria-hidden="true">
      <defs>
        <linearGradient id="faceGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf1" />
          <stop offset="100%" stopColor="#ead7bf" />
        </linearGradient>
        <linearGradient id="faceLine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#854c45" />
          <stop offset="100%" stopColor="#4c2e2b" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="132" r="104" fill="rgba(255,255,255,.13)" />
      <path
        d="M120 30c-54 0-86 40-86 98 0 69 38 112 86 112s86-43 86-112c0-58-32-98-86-98Z"
        fill="url(#faceGlow)"
      />
      <path
        d="M44 109c7-58 37-88 76-88 43 0 74 33 78 91-29-8-52-27-66-55-21 31-51 48-88 52Z"
        fill="#3a2825"
      />
      <path d="M73 125c13-8 26-8 39 0M132 125c13-8 26-8 39 0" fill="none" stroke="url(#faceLine)" strokeLinecap="round" strokeWidth="5" />
      <circle cx="94" cy="137" r="5" fill="#3f2b28" />
      <circle cx="151" cy="137" r="5" fill="#3f2b28" />
      <path d="M120 145c-2 14-5 27-2 34 5 4 11 4 17 1" fill="none" stroke="#b37d68" strokeLinecap="round" strokeWidth="5" />
      <path d="M90 196c18 12 42 12 61 0" fill="none" stroke="#9f5c57" strokeLinecap="round" strokeWidth="6" />
      <path d="M22 132h24M194 132h24M120 4v22M120 240v23" fill="none" stroke="rgba(255,255,255,.64)" strokeLinecap="round" strokeWidth="3" />
    </svg>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const fallbackInputRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep] = useState<HomeStep>(() =>
    new URLSearchParams(window.location.search).get('preview') === 'guide' ? 'guide' : 'home',
  )
  const [capturedImageUri, setCapturedImageUri] = useState('')
  const [isCameraPending, setIsCameraPending] = useState(false)
  const [isAlbumPending, setIsAlbumPending] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [cameraMessage, setCameraMessage] = useState('')
  const [recentResult] = useState(() => getFaceReadingHistory()[0] ?? null)
  const interstitialAd = useFullScreenAd(
    AD_GROUP_IDS.interstitial,
    step === 'review' && Boolean(capturedImageUri),
  )

  useEffect(() => {
    trackScreen('face_reading_home_screen', {
      has_previous_result: Boolean(recentResult),
    })
  }, [recentResult])

  function openGuide() {
    setCameraMessage('')
    setStep('guide')
    trackEvent('face_reading_start')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleNativeCamera() {
    if (isCameraPending || isAlbumPending) {
      return
    }

    setIsCameraPending(true)
    setCameraMessage('')

    try {
      const permission = await openCamera.getPermission()

      if (permission !== 'allowed') {
        const requestedPermission = await openCamera.openPermissionDialog()
        if (requestedPermission !== 'allowed') {
          setCameraMessage('카메라 권한을 허용한 뒤 다시 촬영해 주세요.')
          trackEvent('face_camera_permission_declined')
          return
        }
      }

      const response = await openCamera({ base64: true, maxWidth: 1080 })
      if (!response?.dataUri) {
        setCameraMessage('촬영을 완료하지 않았어요. 다시 시도해 주세요.')
        return
      }

      const imageUri = response.dataUri.startsWith('data:')
        ? response.dataUri
        : `data:image/jpeg;base64,${response.dataUri}`

      setCapturedImageUri(imageUri)
      setStep('review')
      trackEvent('face_camera_capture_complete')
      window.scrollTo({ top: 0 })
    } catch (error) {
      if (error instanceof OpenCameraPermissionError) {
        setCameraMessage('카메라 권한이 꺼져 있어요. 토스 설정에서 권한을 허용해 주세요.')
        trackEvent('face_camera_permission_declined')
      } else {
        console.error('기본 카메라를 여는 데 실패했어요:', error)
        setCameraMessage('지금은 기본 카메라를 열 수 없어요. 아래의 사진 선택을 이용해 주세요.')
      }
    } finally {
      setIsCameraPending(false)
    }
  }

  async function handleAlbumPhoto() {
    if (isAlbumPending || isCameraPending) {
      return
    }

    if (!('ReactNativeWebView' in window)) {
      fallbackInputRef.current?.click()
      return
    }

    setIsAlbumPending(true)
    setCameraMessage('')

    try {
      const permission = await fetchAlbumPhotos.getPermission()

      if (permission !== 'allowed') {
        const requestedPermission = await fetchAlbumPhotos.openPermissionDialog()
        if (requestedPermission !== 'allowed') {
          setCameraMessage('앨범 권한을 허용한 뒤 다시 사진을 선택해 주세요.')
          trackEvent('face_album_permission_declined')
          return
        }
      }

      const [photo] = await fetchAlbumPhotos({
        base64: true,
        maxCount: 1,
        maxWidth: 1080,
      })

      if (!photo?.dataUri) {
        return
      }

      const imageUri = photo.dataUri.startsWith('data:')
        ? photo.dataUri
        : `data:image/jpeg;base64,${photo.dataUri}`

      setCapturedImageUri(imageUri)
      setStep('review')
      trackEvent('face_image_selected', { source: 'native_album' })
      window.scrollTo({ top: 0 })
    } catch (error) {
      if (error instanceof FetchAlbumPhotosPermissionError) {
        setCameraMessage('앨범 권한이 꺼져 있어요. 토스 설정에서 권한을 허용해 주세요.')
        trackEvent('face_album_permission_declined')
      } else {
        console.error('앨범에서 사진을 불러오는 데 실패했어요:', error)
        setCameraMessage('사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setIsAlbumPending(false)
    }
  }

  function handleFallbackImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return
      }

      setCapturedImageUri(reader.result)
      setCameraMessage('')
      setStep('review')
      trackEvent('face_image_selected')
      window.scrollTo({ top: 0 })
    }
    reader.onerror = () => setCameraMessage('사진을 불러오지 못했어요. 다른 사진으로 다시 시도해 주세요.')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function handleAnalyze() {
    if (!capturedImageUri || isAnalyzing) {
      return
    }

    setIsAnalyzing(true)
    trackEvent('face_reading_analysis_start')

    const result = createFaceReading(capturedImageUri)
    saveFaceReading(result)

    await new Promise((resolve) => window.setTimeout(resolve, 1200))
    const adResult = await interstitialAd.show()
    trackEvent('face_result_interstitial_complete', {
      ad_result: adResult,
    })

    navigate('/result', {
      state: {
        imageUri: capturedImageUri,
        record: result,
      },
    })
  }

  if (step === 'guide') {
    return (
      <div className="face-page face-guide-page">
        <button type="button" className="text-back-button" onClick={() => setStep('home')}>
          <span aria-hidden="true">←</span>
          돌아가기
        </button>

        <section className="guide-heading">
          <span className="section-kicker">촬영 가이드</span>
          <h1>얼굴이 잘 보이게<br />한 장만 찍어주세요</h1>
          <p>기본 카메라로 촬영한 사진 한 장만 확인해요.</p>
        </section>

        <section className="guide-visual-card" aria-label="얼굴 촬영 예시">
          <div className="guide-viewfinder">
            <img src={DEMO_FACE_IMAGE_URI} alt="" />
            <span className="guide-viewfinder__oval" />
            <span className="guide-viewfinder__eyes" />
          </div>
          <div className="guide-quality-badge">
            <span className="guide-quality-badge__check">✓</span>
            이 정도면 좋아요
          </div>
        </section>

        <section className="capture-tip-list" aria-label="촬영 팁">
          <div className="capture-tip">
            <span className="capture-tip__number">1</span>
            <div>
              <strong>밝은 곳에서 정면 보기</strong>
              <p>눈썹부터 턱선까지 그림자 없이 보여주세요.</p>
            </div>
          </div>
          <div className="capture-tip">
            <span className="capture-tip__number">2</span>
            <div>
              <strong>안경과 모자는 잠시 벗기</strong>
              <p>얼굴 윤곽과 눈매가 가려지지 않게 해주세요.</p>
            </div>
          </div>
          <div className="capture-tip">
            <span className="capture-tip__number">3</span>
            <div>
              <strong>표정은 편안하게</strong>
              <p>입을 다물고 자연스러운 표정으로 촬영해 주세요.</p>
            </div>
          </div>
        </section>

        {cameraMessage ? <p className="inline-error" role="alert">{cameraMessage}</p> : null}

        <div className="sticky-action-area">
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleNativeCamera()}
            disabled={isCameraPending || isAlbumPending}
          >
            <span className="button-camera-icon" aria-hidden="true" />
            {isCameraPending ? '기본 카메라 여는 중...' : '기본 카메라로 촬영하기'}
          </button>
          <button
            type="button"
            className="subtle-button"
            onClick={() => void handleAlbumPhoto()}
            disabled={isCameraPending || isAlbumPending}
          >
            {isAlbumPending ? '앨범 여는 중...' : '사진에서 선택'}
          </button>
        </div>

        <input
          ref={fallbackInputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={handleFallbackImage}
        />
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="face-page photo-review-page">
        <button
          type="button"
          className="text-back-button"
          onClick={() => {
            setCapturedImageUri('')
            setStep('guide')
          }}
        >
          <span aria-hidden="true">←</span>
          다시 선택
        </button>

        <section className="review-heading">
          <span className="section-kicker">사진 확인</span>
          <h1>이 사진으로<br />관상을 볼까요?</h1>
          <p>얼굴 전체가 선명하게 보이는지 확인해 주세요.</p>
        </section>

        <div className="review-photo">
          <img src={capturedImageUri} alt="관상 분석에 사용할 얼굴 사진" />
          <span className="review-photo__frame" aria-hidden="true" />
          <span className="review-photo__privacy">사진은 저장하지 않아요</span>
        </div>

        <div className="review-checks">
          <span><i aria-hidden="true">✓</i> 정면 얼굴</span>
          <span><i aria-hidden="true">✓</i> 밝은 조명</span>
          <span><i aria-hidden="true">✓</i> 한 명만</span>
        </div>

        <div className="sticky-action-area">
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                얼굴의 기운을 읽는 중...
              </>
            ) : '이 사진으로 관상 보기'}
          </button>
          <button
            type="button"
            className="subtle-button"
            onClick={() => void handleNativeCamera()}
            disabled={isAnalyzing || isCameraPending}
          >
            다시 촬영하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="face-page face-home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="hero-label"><i aria-hidden="true" /> 돌려 말하지 않는 얼굴 풀이</span>
          <h1>좋은 말만 하지 않는<br /><em>진짜 내 관상</em></h1>
          <p>남이 보는 나, 숨겨둔 속마음, 지금 들어온 운까지 핵심만 짚어드려요.</p>
        </div>

        <div className="home-hero__visual">
          <span className="orbit orbit--one" aria-hidden="true" />
          <span className="orbit orbit--two" aria-hidden="true" />
          <span className="floating-glyph floating-glyph--left" aria-hidden="true">福</span>
          <span className="floating-glyph floating-glyph--right" aria-hidden="true">運</span>
          <FaceSymbol />
        </div>

        <button type="button" className="hero-primary-button" onClick={openGuide}>
          내 얼굴, 솔직하게 보기
          <span aria-hidden="true">→</span>
        </button>
        <p className="privacy-caption">
          <span className="privacy-lock" aria-hidden="true" />
          촬영 사진은 서버에 전송하거나 저장하지 않아요
        </p>
      </section>

      <section className="fortune-preview-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">한눈에 보는 관상</span>
            <h2>이 네 가지만 보면 돼요</h2>
          </div>
          <span className="mini-seal" aria-hidden="true">相</span>
        </div>

        <div className="fortune-preview-grid fortune-preview-grid--four">
          <article className="fortune-preview-card fortune-preview-card--wealth">
            <span className="fortune-preview-card__icon">人</span>
            <strong>첫인상</strong>
            <p>남들이<br />보는 내 모습</p>
          </article>
          <article className="fortune-preview-card fortune-preview-card--people">
            <span className="fortune-preview-card__icon">心</span>
            <strong>속마음</strong>
            <p>나를 움직이는<br />진짜 본심</p>
          </article>
          <article className="fortune-preview-card fortune-preview-card--work">
            <span className="fortune-preview-card__icon">運</span>
            <strong>운의 흐름</strong>
            <p>재물·인연·성취<br />강약 비교</p>
          </article>
          <article className="fortune-preview-card fortune-preview-card--advice">
            <span className="fortune-preview-card__icon">行</span>
            <strong>오늘의 한 수</strong>
            <p>바로 실천할<br />현실 조언</p>
          </article>
        </div>
      </section>

      {recentResult ? (
        <section className="recent-result-card">
          <div className="recent-result-card__top">
            <span className="section-kicker">최근 관상</span>
            <time>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(recentResult.createdAt))}</time>
          </div>
          <div className="recent-result-card__body">
            <span className="recent-result-card__score">{recentResult.totalScore}</span>
            <div>
              <strong>{recentResult.title}</strong>
              <p>{recentResult.keywords.slice(0, 3).map((keyword) => `#${keyword}`).join('  ')}</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate(`/result?id=${recentResult.id}`)}>
            결과 다시 보기 <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      <section className="how-it-works">
        <span className="section-kicker">HOW IT WORKS</span>
        <h2>복잡한 과정 없이<br />금방 확인해요</h2>
        <ol>
          <li>
            <span>01</span>
            <div><strong>기본 카메라로 촬영</strong><p>실시간 영상 없이 사진 한 장만 사용해요.</p></div>
          </li>
          <li>
            <span>02</span>
            <div><strong>얼굴의 인상 포인트 확인</strong><p>이마, 눈매, 코, 입매, 턱선을 살펴봐요.</p></div>
          </li>
          <li>
            <span>03</span>
            <div><strong>나만의 관상 카드 완성</strong><p>성향과 세 가지 운세를 한눈에 보여드려요.</p></div>
          </li>
        </ol>
      </section>

      <aside className="entertainment-notice">
        <span aria-hidden="true">i</span>
        <p>관상 결과는 전통적인 관상 해석을 바탕으로 만든 재미용 콘텐츠예요. 중요한 판단의 근거로 사용하지 마세요.</p>
      </aside>
    </div>
  )
}
