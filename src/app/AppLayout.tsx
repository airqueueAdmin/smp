import { Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const location = useLocation()
  const capture = new URLSearchParams(location.search).get('capture')
  const isCaptureMode = capture !== null
  const isWideCapture = capture === 'landscape' || capture === 'thumbnail'

  return (
    <div className={isCaptureMode ? 'app-shell app-shell--capture' : 'app-shell'}>
      <div
        className={
          isCaptureMode
            ? isWideCapture
              ? 'app-frame app-frame--capture app-frame--wide'
              : 'app-frame app-frame--capture'
            : 'app-frame'
        }
      >
        {!isCaptureMode && (
          <header className="app-header">
            <p className="app-header__eyebrow">Summer Ping · 퍼스널 선케어</p>
            <h1 className="app-header__title">외출 중에도 선케어 타이밍을 놓치지 마세요</h1>
            <p className="app-header__description">
              얼굴 변화와 자외선 강도를 바탕으로 덧바를 시점을 안내하는 선케어 서비스입니다.
            </p>
          </header>
        )}

        <main className={isCaptureMode ? 'app-content app-content--capture' : 'app-content'}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
