import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { trackScreen } from '../../lib/analytics'
import { getFaceReadingHistory } from './storage'

export function FaceReadingHistoryPage() {
  const location = useLocation()
  const [history] = useState(() => getFaceReadingHistory())

  useEffect(() => {
    trackScreen('face_reading_history_screen', { result_count: history.length })
  }, [history.length])

  return (
    <div className="face-page history-page">
      <section className="history-heading">
        <span className="section-kicker">MY FACE RECORD</span>
        <h1>나의 관상 기록</h1>
        <p>사진은 남기지 않고 결과 요약만 이 기기에 보관해요.</p>
      </section>

      {history.length ? (
        <ol className="reading-history-list">
          {history.map((record) => (
            <li key={record.id}>
              <Link to={`/result?id=${record.id}`} state={{ from: location.pathname }}>
                <div className="reading-history-list__score">
                  <strong>{record.totalScore}</strong>
                  <span>점</span>
                </div>
                <div className="reading-history-list__copy">
                  <time>
                    {new Intl.DateTimeFormat('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).format(new Date(record.createdAt))}
                  </time>
                  <strong>{record.title}</strong>
                  <p>{record.keywords.map((keyword) => `#${keyword}`).join(' ')}</p>
                </div>
                <span className="reading-history-list__arrow" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <section className="history-empty">
          <span aria-hidden="true">相</span>
          <strong>아직 남겨진 결과가 없어요</strong>
          <p>첫 관상을 보면 이곳에서 언제든 다시 확인할 수 있어요.</p>
        </section>
      )}

      <Link className="primary-button history-primary-button" to="/">새 관상 보기</Link>
    </div>
  )
}
