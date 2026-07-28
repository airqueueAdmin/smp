import { getTossShareLink, share } from '@apps-in-toss/web-framework'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { trackEvent, trackScreen } from '../../lib/analytics'
import { DEMO_FACE_IMAGE_URI } from '../home/HomePage'
import {
  createFaceReading,
  FaceReadingRecord,
  getFaceReadingById,
  getFaceReadingHistory,
} from './storage'

const APP_NAME = import.meta.env.VITE_APPS_IN_TOSS_APP_NAME ?? 'summer-ping'

type ResultLocationState = {
  imageUri?: string
  record?: FaceReadingRecord
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
        message: `내 관상 팩폭은 ‘${record.title}’, 얼굴 기운은 ${record.totalScore}점이래요. 좋은 말만 안 해주는 관상, 직접 확인해 보세요. ${link}`,
      })
      setShareMessage('공유 화면을 열었어요.')
      trackEvent('face_reading_share_complete', { reading_type: record.title })
    } catch (error) {
      console.error('관상 결과 공유에 실패했어요:', error)
      setShareMessage('지금은 공유할 수 없어요. 잠시 후 다시 시도해 주세요.')
      trackEvent('face_reading_share_failed')
    }
  }

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
        <p className="result-hero__summary">{record.summary}</p>
      </section>

      <section className="result-section blunt-report-section">
        <span className="section-kicker">팩폭 리포트</span>
        <h2>좋은 말만 하지는 않을게요</h2>

        <div className="fact-bomb-lead">
          <span>한 줄 팩폭</span>
          <strong>“{record.punchline}”</strong>
        </div>

        <div className="personality-depth-list">
          <article>
            <span>처음 보이는 모습</span>
            <strong>겉으로는 이렇게 보여요</strong>
            <p>{record.outerImpression}</p>
          </article>
          <article>
            <span>진짜 동력</span>
            <strong>속으로는 이걸 원해요</strong>
            <p>{record.innerDrive}</p>
          </article>
          <article className="personality-depth-list__warning">
            <span>꼬이는 순간</span>
            <strong>스트레스 받으면 이렇게 돼요</strong>
            <p>{record.stressPattern}</p>
          </article>
        </div>

        <div className="strength-blind-grid">
          <article className="strength-blind-card strength-blind-card--strength">
            <div className="strength-blind-card__heading">
              <span aria-hidden="true">+</span>
              <strong>확실히 잘하는 것</strong>
            </div>
            <ul>
              {record.strengths.map((strength) => <li key={strength}>{strength}</li>)}
            </ul>
          </article>
          <article className="strength-blind-card strength-blind-card--blind">
            <div className="strength-blind-card__heading">
              <span aria-hidden="true">!</span>
              <strong>좀 찔리는 구석</strong>
            </div>
            <ul>
              {record.blindSpots.map((blindSpot) => <li key={blindSpot}>{blindSpot}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="result-section fortune-score-section">
        <span className="section-kicker">세 가지 기운</span>
        <h2>점수보다 중요한 현실 조언</h2>
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
                <em>{category.score}</em>
              </div>
              <div className="fortune-score__fact-bomb">
                <span>팩폭</span>
                <p>{category.factBomb}</p>
              </div>
              <div className="fortune-score__action">
                <span aria-hidden="true">→</span>
                <p>{category.action}</p>
              </div>
              <div className="fortune-score__track" aria-label={`${category.label} ${category.score}점`}>
                <span style={{ width: `${category.score}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="result-section face-point-section">
        <span className="section-kicker">얼굴 풀이</span>
        <h2>이렇게 읽었어요</h2>
        <div className="face-point-list">
          {record.facePoints.map((point, index) => (
            <article key={point.part} className="face-point-item">
              <div className="face-point-item__marker">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <i aria-hidden="true" />
              </div>
              <div>
                <span className="face-point-item__part">{point.part}</span>
                <strong>{point.headline}</strong>
                <p>{point.description}</p>
                <blockquote>
                  <span>팩폭</span>
                  {point.factBomb}
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lucky-tip-card">
        <div className="lucky-tip-card__title">
          <span aria-hidden="true">福</span>
          <div><small>오늘의 현실 처방</small><strong>운보다 먼저 바꿀 한 가지</strong></div>
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
        이 결과는 전통 관상 해석을 바탕으로 만든 오락용 콘텐츠이며 과학적·의학적 판단을 제공하지 않아요.
      </p>
    </div>
  )
}
