import { getTossShareLink, share } from '@apps-in-toss/web-framework'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { trackEvent, trackScreen } from '../../lib/analytics'
import { getLastAppliedAt, getSuncareHistory, recordSuncareApplication } from './storage'

type ActionMode = 'start' | 'reapply' | 'today' | 'history'

const APP_NAME = import.meta.env.VITE_APPS_IN_TOSS_APP_NAME ?? 'summer-ping'

function formatKoreanDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getTodayCondition() {
  const now = new Date()
  const hour = now.getHours()
  const month = now.getMonth() + 1
  const isSummer = month >= 6 && month <= 8
  const isPeak = hour >= 11 && hour <= 16
  const uv = (isSummer ? 6 : 4) + (isPeak ? 2 : 0)
  return { hour, uv, label: uv >= 8 ? '매우 높음' : uv >= 6 ? '높음' : uv >= 3 ? '보통' : '낮음' }
}

export function SuncareActionPage({ mode }: { mode: ActionMode }) {
  const location = useLocation()
  const [lastAppliedAt, setLastAppliedAt] = useState(() => getLastAppliedAt())
  const [recordedAtThisVisit, setRecordedAtThisVisit] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const history = useMemo(() => getSuncareHistory(), [lastAppliedAt])
  const condition = useMemo(() => getTodayCondition(), [])

  useEffect(() => {
    trackScreen(`suncare_${mode}_screen`, { path: location.pathname })
    if (new URLSearchParams(location.search).get('source') === 'notification') {
      trackEvent('push_open', { destination: mode })
    }
  }, [location.pathname, location.search, mode])

  function handleRecord() {
    const isFirstRecord = !getLastAppliedAt()
    const record = recordSuncareApplication({
      source: isFirstRecord ? 'start' : 'reapply',
    })
    setLastAppliedAt(record.appliedAt)
    setRecordedAtThisVisit(record.appliedAt)
    trackEvent(isFirstRecord ? 'first_record_complete' : 'reapply_complete', {
      entry_path: location.pathname,
      action_mode: mode,
    })
  }

  async function handleShare() {
    try {
      trackEvent('share_start', { screen: mode })
      const link = await getTossShareLink(`intoss://${APP_NAME}/today?referrer=share`)
      await share({
        message: `오늘 자외선은 ${condition.label} 단계예요. 선크림 덧바를 시간을 같이 확인해요. ${link}`,
      })
      setShareMessage('공유 화면을 열었어요.')
      trackEvent('share_complete', { screen: mode })
    } catch (error) {
      console.error('공유 링크를 만드는 데 실패했어요:', error)
      setShareMessage('지금은 공유할 수 없어요. 잠시 후 다시 시도해 주세요.')
      trackEvent('share_failed', { screen: mode })
    }
  }

  if (mode === 'history') {
    return (
      <div className="page-shell quick-page">
        <section className="quick-hero">
          <p className="eyebrow">이번 달 선케어</p>
          <h2 className="hero-title">내가 챙긴 시간을 모아봤어요</h2>
          <p className="hero-description">기기에만 저장된 최근 기록을 확인할 수 있어요.</p>
        </section>

        <section className="content-panel">
          <div className="toolbar-row">
            <h3 className="content-panel__title">최근 기록</h3>
            <span className="status-badge">{history.length}회</span>
          </div>
          {history.length ? (
            <ol className="history-list">
              {history.map((record) => (
                <li key={record.id}>
                  <span>{record.source === 'reapply' ? '덧바름 완료' : '선케어 시작'}</span>
                  <strong>{formatKoreanDateTime(record.appliedAt)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <strong>아직 기록이 없어요</strong>
              <p>선크림을 바른 시간을 기록하면 이곳에서 이어서 볼 수 있어요.</p>
            </div>
          )}
          <Link className="text-link" to="/start">
            지금 기록하기
          </Link>
        </section>
      </div>
    )
  }

  if (mode === 'today') {
    return (
      <div className="page-shell quick-page">
        <section className="quick-hero quick-hero--blue">
          <p className="eyebrow">오늘의 선케어</p>
          <h2 className="hero-title">자외선 {condition.label} · Lv. {condition.uv}</h2>
          <p className="hero-description">
            {lastAppliedAt
              ? `${formatKoreanDateTime(lastAppliedAt)}에 마지막으로 발랐어요.`
              : '아직 오늘 선크림을 바른 시간이 기록되지 않았어요.'}
          </p>
          <Link className="quick-primary-link" to={lastAppliedAt ? '/reapply' : '/start'}>
            {lastAppliedAt ? '덧바른 시간 기록하기' : '지금 바른 시간 기록하기'}
          </Link>
        </section>

        <section className="content-panel">
          <h3 className="content-panel__title">친구와 함께 확인해요</h3>
          <p className="helper-text">오늘 자외선 단계와 썸머핑 바로가기를 공유할 수 있어요.</p>
          <button type="button" className="primary-action primary-action--blue" onClick={handleShare}>
            오늘의 선케어 공유하기
          </button>
          {shareMessage ? <p className="helper-text helper-text--tight">{shareMessage}</p> : null}
        </section>

        <Link className="text-link" to="/history">
          내 선케어 기록 보기
        </Link>
      </div>
    )
  }

  const isReapply = mode === 'reapply'
  const hasRecordedThisVisit = Boolean(recordedAtThisVisit)

  return (
    <div className="page-shell quick-page">
      <section className="quick-hero quick-hero--blue">
        <p className="eyebrow">{isReapply ? '덧바를 시간' : '선케어 시작'}</p>
        <h2 className="hero-title">
          {hasRecordedThisVisit
            ? isReapply
              ? '덧바른 시간을 기록했어요'
              : '오늘 선케어를 시작했어요'
            : isReapply
              ? '선크림을 다시 발랐나요?'
              : '방금 바른 시간을 남겨요'}
        </h2>
        <p className="hero-description">
          {hasRecordedThisVisit
            ? `${formatKoreanDateTime(recordedAtThisVisit)}을 기준으로 다음 타이밍을 계산해요.`
            : '한 번만 누르면 기록되고, 홈에서 다음 덧바를 시간을 확인할 수 있어요.'}
        </p>
        <button type="button" className="quick-primary-button" onClick={handleRecord}>
          {isReapply ? '덧바름 완료' : '지금 바름'}
        </button>
      </section>

      <div className="quick-link-grid">
        <Link to="/">얼굴 변화 확인</Link>
        <Link to="/today">오늘 자외선</Link>
        <Link to="/history">선케어 기록</Link>
      </div>
    </div>
  )
}
