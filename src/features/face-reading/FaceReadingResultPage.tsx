import { getTossShareLink, share } from '@apps-in-toss/web-framework'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import {
  AD_GROUP_IDS,
  TossBannerAd,
  useFullScreenAd,
} from '../../lib/ads'
import { trackEvent, trackScreen } from '../../lib/analytics'
import { DEMO_FACE_IMAGE_URI } from '../home/HomePage'
import {
  createFaceReading,
  FaceReadingRecord,
  getFaceReadingById,
  getFaceReadingHistory,
} from './storage'

const APP_NAME = import.meta.env.VITE_APPS_IN_TOSS_APP_NAME ?? 'summer-ping'
const DETAIL_UNLOCKS_KEY = 'gwansang-log:rewarded-detail-unlocks'

type ResultLocationState = {
  imageUri?: string
  record?: FaceReadingRecord
}

function getDetailUnlocks() {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(DETAIL_UNLOCKS_KEY) ?? '[]',
    )

    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function formatReadingDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

function ResultStamp() {
  return (
    <svg className="result-stamp" viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="45" cy="45" r="41" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="45" cy="45" r="34" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <text x="45" y="40" textAnchor="middle">觀相</text>
      <text x="45" y="60" textAnchor="middle">今日</text>
    </svg>
  )
}

export function FaceReadingResultPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [shareMessage, setShareMessage] = useState('')
  const [rewardMessage, setRewardMessage] = useState('')
  const [detailUnlocks, setDetailUnlocks] = useState(getDetailUnlocks)
  const state = (location.state ?? {}) as ResultLocationState
  const isDemoPreview = searchParams.get('preview') === 'demo'
  const resultImageUri = state.imageUri ?? (isDemoPreview ? DEMO_FACE_IMAGE_URI : '')
  const record = useMemo(() => {
    if (state.record) {
      return state.record
    }

    const id = searchParams.get('id')
    if (id) {
      return getFaceReadingById(id)
    }

    return isDemoPreview
      ? createFaceReading('gwansang-log-result-preview')
      : getFaceReadingHistory()[0] ?? null
  }, [isDemoPreview, searchParams, state.record])
  const isDetailUnlocked = Boolean(
    isDemoPreview || (record && detailUnlocks.includes(record.id)),
  )
  const rewardedAd = useFullScreenAd(
    AD_GROUP_IDS.rewarded,
    Boolean(record) && !isDetailUnlocked,
  )

  useEffect(() => {
    trackScreen('face_reading_result_screen', {
      reading_type: record?.title ?? 'empty',
      has_photo: Boolean(resultImageUri),
    })
  }, [record?.title, resultImageUri])

  async function handleShare() {
    if (!record) {
      return
    }

    try {
      trackEvent('face_reading_share_start', { reading_type: record.title })
      const link = await getTossShareLink(`intoss://${APP_NAME}/?referrer=share`)
      await share({
        message: `제 관상은 ‘${record.title}’, 얼굴 기운은 ${record.totalScore}점이래요. 돌려 말하지 않는 관상 결과도 확인해 보세요. ${link}`,
      })
      setShareMessage('공유 화면을 열었어요.')
      trackEvent('face_reading_share_complete', { reading_type: record.title })
    } catch (error) {
      console.error('관상 결과 공유에 실패했어요:', error)
      setShareMessage('지금은 공유할 수 없어요. 잠시 후 다시 시도해 주세요.')
      trackEvent('face_reading_share_failed')
    }
  }

  async function handleRewardedDetail() {
    if (!record) {
      return
    }

    if (rewardedAd.status === 'error' || rewardedAd.status === 'idle') {
      setRewardMessage('광고를 다시 준비하고 있어요.')
      rewardedAd.load()
      return
    }

    if (rewardedAd.status !== 'ready') {
      return
    }

    setRewardMessage('')
    trackEvent('face_detail_rewarded_ad_start', {
      reading_type: record.title,
    })

    const adResult = await rewardedAd.show()
    trackEvent('face_detail_rewarded_ad_complete', {
      ad_result: adResult,
      reading_type: record.title,
    })

    if (adResult === 'rewarded') {
      const nextUnlocks = Array.from(new Set([...detailUnlocks, record.id]))
      window.localStorage.setItem(
        DETAIL_UNLOCKS_KEY,
        JSON.stringify(nextUnlocks),
      )
      setDetailUnlocks(nextUnlocks)
      setRewardMessage('얼굴 5부위 상세 풀이를 열었어요.')
      return
    }

    setRewardMessage(
      adResult === 'dismissed'
        ? '광고 시청을 완료하면 상세 풀이가 열려요.'
        : '광고를 표시하지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
    rewardedAd.load()
  }

  const rewardedButtonLabel = {
    idle: '광고 다시 준비하기',
    loading: '광고 준비 중...',
    ready: '광고 보고 상세 풀이 열기',
    showing: '광고 보는 중...',
    unsupported: '토스 앱에서 상세 풀이 열기',
    error: '광고 다시 불러오기',
  }[rewardedAd.status]

  if (!record) {
    return (
      <div className="face-page empty-result-page">
        <span className="empty-result-page__symbol">相</span>
        <h1>아직 관상 결과가 없어요</h1>
        <p>사진 한 장을 촬영하면 얼굴에 담긴 기운을 재미있게 풀어드려요.</p>
        <Link className="primary-button" to="/">관상 보러가기</Link>
      </div>
    )
  }

  const rankedFortunes = [...record.categories].sort((a, b) => b.score - a.score)
  const strongestFortune = rankedFortunes[0]
  const fortuneToWatch = rankedFortunes[rankedFortunes.length - 1]

  return (
    <div className="face-page result-page">
      <section className="result-hero">
        <div className="result-hero__glow" aria-hidden="true" />
        <div className="result-hero__header">
          <div>
            <span className="result-hero__kicker">오늘의 얼굴 기운</span>
            <time>{formatReadingDate(record.createdAt)}</time>
          </div>
          <ResultStamp />
        </div>

        {resultImageUri ? (
          <div className="result-portrait">
            <img src={resultImageUri} alt="관상 결과에 사용한 얼굴" />
            <span className="result-portrait__ring" aria-hidden="true" />
          </div>
        ) : (
          <div className="result-portrait result-portrait--placeholder" aria-hidden="true">
            <span>相</span>
          </div>
        )}

        <div className="result-score">
          <span>얼굴 기운</span>
          <strong>{record.totalScore}</strong>
          <small>점</small>
        </div>
        <h1>{record.title}</h1>
        <p className="result-hero__subtitle">{record.subtitle}</p>
        <div className="result-keywords">
          {record.keywords.map((keyword) => <span key={keyword}>#{keyword}</span>)}
        </div>
      </section>

      <section className="result-section blunt-report-section">
        <span className="section-kicker">관상가의 첫 판단</span>
        <h2>이 얼굴, 이렇게 읽혀요</h2>

        <div className="fact-bomb-lead">
          <span>결론부터</span>
          <strong>“{record.punchline}”</strong>
        </div>

        <p className="reading-summary">{record.summary}</p>

        <div className="reading-evidence">
          <div className="reading-evidence__heading">
            <span aria-hidden="true">相</span>
            <div>
              <strong>이 얼굴에서 읽은 근거예요</strong>
              <p>다섯 부위의 인상을 함께 보고 전체 성향을 풀었어요.</p>
            </div>
          </div>
          <ul>
            {record.facePoints.map((point) => (
              <li key={point.part}>
                <span>{point.part}</span>
                <strong>{point.headline}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="personality-depth-list">
          <article>
            <span>남이 보는 나</span>
            <strong>첫인상은 이래요</strong>
            <p>{record.outerImpression}</p>
          </article>
          <article>
            <span>진짜 속마음</span>
            <strong>나를 움직이는 힘</strong>
            <p>{record.innerDrive}</p>
          </article>
          <article className="personality-depth-list__warning">
            <span>주의 신호</span>
            <strong>힘들 때 나오는 모습</strong>
            <p>{record.stressPattern}</p>
          </article>
        </div>

        <div className="strength-blind-grid">
          <article className="strength-blind-card strength-blind-card--strength">
            <div className="strength-blind-card__heading">
              <span aria-hidden="true">＋</span>
              <strong>확실한 강점</strong>
            </div>
            <ul>
              {record.strengths.slice(0, 2).map((strength) => <li key={strength}>{strength}</li>)}
            </ul>
          </article>
          <article className="strength-blind-card strength-blind-card--blind">
            <div className="strength-blind-card__heading">
              <span aria-hidden="true">!</span>
              <strong>놓치기 쉬운 점</strong>
            </div>
            <ul>
              {record.blindSpots.slice(0, 2).map((blindSpot) => <li key={blindSpot}>{blindSpot}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="result-section fortune-score-section">
        <span className="section-kicker">지금 들어온 운</span>
        <h2>좋은 운과 조심할 운</h2>

        <div className="fortune-at-a-glance">
          <article className="fortune-spotlight">
            <span className="fortune-spotlight__label">가장 좋은 운</span>
            <div>
              <strong>{strongestFortune.label}</strong>
              <em>{strongestFortune.score}<small>점</small></em>
            </div>
            <p>{strongestFortune.summary}</p>
          </article>
          <p className="fortune-watch">
            <span aria-hidden="true">!</span>
            <strong>{fortuneToWatch.label}</strong>은 서두르지 말고 기본부터 챙기세요.
          </p>
        </div>

        <div className="fortune-score-list">
          {record.categories.map((category) => (
            <article key={category.key} className={`fortune-score fortune-score--${category.key}`}>
              <div className="fortune-score__heading">
                <span className="fortune-score__symbol" aria-hidden="true">
                  {category.key === 'wealth' ? '財' : category.key === 'relationship' ? '緣' : '成'}
                </span>
                <div>
                  <strong>{category.label}</strong>
                  <p>{category.summary}</p>
                </div>
                <em>{category.score}<small>점</small></em>
              </div>
              <div className="fortune-score__fact-bomb">
                <span>풀이</span>
                <p>{category.factBomb}</p>
              </div>
              <div className="fortune-score__action">
                <span aria-hidden="true">→</span>
                <p><strong>오늘의 한 수</strong> {category.action}</p>
              </div>
              <div className="fortune-score__track" aria-label={`${category.label} ${category.score}점`}>
                <span style={{ width: `${category.score}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {isDetailUnlocked ? (
        <section className="result-section face-point-section">
          <span className="section-kicker">얼굴 5부위 상세 풀이</span>
          <h2>인상을 만드는 포인트</h2>
          <div className="face-point-list">
            {record.facePoints.map((point, index) => (
              <article key={point.part} className="face-point-item">
                <div className="face-point-item__marker" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <i />
                </div>
                <div>
                  <span className="face-point-item__part">{point.part}</span>
                  <strong>{point.headline}</strong>
                  <p>{point.description}</p>
                  <blockquote>
                    <span>한마디</span>
                    {point.factBomb}
                  </blockquote>
                </div>
              </article>
            ))}
          </div>
          {rewardMessage ? <p className="reward-status" role="status">{rewardMessage}</p> : null}
        </section>
      ) : (
        <section className="result-section rewarded-detail-section">
          <span className="section-kicker">얼굴 5부위 상세 풀이</span>
          <h2>이마부터 턱선까지 더 볼까요?</h2>
          <div className="rewarded-detail-card">
            <span className="rewarded-detail-card__symbol" aria-hidden="true">解</span>
            <div>
              <strong>내 인상을 만드는 5가지 포인트</strong>
              <p>짧은 광고 시청을 완료하면 이마·눈매·코·입매·턱선 풀이를 모두 열어드려요.</p>
            </div>
          </div>
          <button
            type="button"
            className="primary-button rewarded-detail-button"
            onClick={() => void handleRewardedDetail()}
            disabled={
              rewardedAd.status === 'loading' ||
              rewardedAd.status === 'showing' ||
              rewardedAd.status === 'unsupported'
            }
          >
            {rewardedButtonLabel}
          </button>
          {rewardMessage ? <p className="reward-status" role="status">{rewardMessage}</p> : null}
        </section>
      )}

      <TossBannerAd />

      <section className="lucky-tip-card">
        <div className="lucky-tip-card__title">
          <span aria-hidden="true">行</span>
          <div><small>관상가의 처방</small><strong>오늘은 이것 하나만</strong></div>
        </div>
        <p className="lucky-tip-card__prescription">{record.resetAction}</p>
        <dl>
          <div><dt>행운의 색</dt><dd>{record.luckyColor}</dd></div>
          <div><dt>좋은 시간</dt><dd>{record.luckyMoment}</dd></div>
        </dl>
      </section>

      <div className="result-actions">
        <button type="button" className="primary-button" onClick={() => void handleShare()}>
          친구에게 결과 공유하기
        </button>
        <Link className="subtle-button" to="/">다른 사진으로 다시 보기</Link>
        {shareMessage ? <p role="status">{shareMessage}</p> : null}
      </div>

      <p className="result-disclaimer">
        이 결과는 과학적·의학적 판단을 제공하지 않아요.
      </p>
    </div>
  )
}
