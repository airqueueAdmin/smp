import { useLayoutEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const location = useLocation()
  const isSubmissionCapture = new URLSearchParams(location.search).has('capture')
  const isFunnelStep = location.pathname === '/' && new URLSearchParams(location.search).has('step')

  useLayoutEffect(() => {
    if (isSubmissionCapture) {
      window.scrollTo(0, 0)
    }
  }, [isSubmissionCapture, location.pathname, location.search])

  return (
    <div className={isSubmissionCapture ? 'app-shell app-shell--submission' : 'app-shell'}>
      <div className={isSubmissionCapture ? 'app-frame app-frame--submission' : 'app-frame'}>
        {!isSubmissionCapture ? (
          <header className={`app-topbar${isFunnelStep ? ' app-topbar--funnel' : ''}`}>
            <Link className="app-brand" to="/" aria-label="관상 기록 홈">
              <span className="app-brand__mark" aria-hidden="true">相</span>
              <span>관상 기록</span>
            </Link>
            {isFunnelStep ? (
              <Link className="app-topbar__back" to="/">나가기</Link>
            ) : (
              <Link className="app-topbar__history" to="/history">
                기록 <span aria-hidden="true">↗</span>
              </Link>
            )}
          </header>
        ) : null}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
