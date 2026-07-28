import { useLayoutEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isSubmissionCapture = new URLSearchParams(location.search).has('capture')

  useLayoutEffect(() => {
    if (isSubmissionCapture) {
      window.scrollTo(0, 0)
    }
  }, [isSubmissionCapture, location.pathname, location.search])

  return (
    <div className={isSubmissionCapture ? 'app-shell app-shell--submission' : 'app-shell'}>
      <div className={isSubmissionCapture ? 'app-frame app-frame--submission' : 'app-frame'}>
        <header className="top-navigation">
          <Link className="brand-link" to="/" aria-label="진짜 내 관상 홈">
            <span className="brand-seal" aria-hidden="true">相</span>
            <span>
              <strong>진짜 내 관상</strong>
              <small>오늘의 얼굴 기운</small>
            </span>
          </Link>

          {isHome ? (
            <Link className="history-link" to="/history">나의 기록</Link>
          ) : (
            <Link className="history-link" to="/">홈으로</Link>
          )}
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
