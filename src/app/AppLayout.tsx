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
            <p className="app-header__eyebrow">7월 챌린지 · 선크림 리마인드</p>
            <h1 className="app-header__title">선크림을 발라요</h1>
            <p className="app-header__description">
              Summer Ping은 얼굴 상태 변화를 통해 사용자가 선크림을 제때 다시 바르도록 유도하는
              서비스입니다.
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
