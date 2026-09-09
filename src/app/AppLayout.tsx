import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const location = useLocation()
  const isSubmissionCapture = new URLSearchParams(location.search).has('capture')

  useLayoutEffect(() => {
    if (isSubmissionCapture) {
      window.scrollTo(0, 0)
    }
  }, [isSubmissionCapture, location.pathname, location.search])

  return (
    <div className={isSubmissionCapture ? 'app-shell app-shell--submission' : 'app-shell'}>
      <div className={isSubmissionCapture ? 'app-frame app-frame--submission' : 'app-frame'}>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
