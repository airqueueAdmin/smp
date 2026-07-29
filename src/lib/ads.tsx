import {
  loadFullScreenAd,
  showFullScreenAd,
  TossAds,
} from '@apps-in-toss/web-framework'
import { useCallback, useEffect, useRef, useState } from 'react'

import { trackEvent, trackImpression } from './analytics'

const LIVE_AD_GROUP_IDS = {
  interstitial: 'ait.v2.live.10f88c970eda47e9',
  banner: 'ait.v2.live.67fffe28e9864be5',
  rewarded: 'ait.v2.live.de03aea0778648a3',
} as const

const TEST_AD_GROUP_IDS = {
  interstitial: 'ait-ad-test-interstitial-id',
  banner: 'ait-ad-test-banner-id',
  rewarded: 'ait-ad-test-rewarded-id',
} as const

const useTestAds =
  import.meta.env.DEV || import.meta.env.VITE_ADS_TEST_MODE === 'true'

export const AD_GROUP_IDS = useTestAds
  ? TEST_AD_GROUP_IDS
  : LIVE_AD_GROUP_IDS

export type FullScreenAdStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'showing'
  | 'unsupported'
  | 'error'

export type FullScreenAdResult =
  | 'dismissed'
  | 'rewarded'
  | 'failed'
  | 'unavailable'

function isFullScreenAdSupported() {
  try {
    return (
      loadFullScreenAd.isSupported() &&
      showFullScreenAd.isSupported()
    )
  } catch {
    return false
  }
}

function reportAdError(message: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, error)
  }
}

export function useFullScreenAd(adGroupId: string, enabled = true) {
  const [status, setStatus] = useState<FullScreenAdStatus>('idle')
  const isLoadedRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const loadCleanupRef = useRef<(() => void) | null>(null)
  const showCleanupRef = useRef<(() => void) | null>(null)

  const cleanupLoad = useCallback(() => {
    loadGenerationRef.current += 1
    loadCleanupRef.current?.()
    loadCleanupRef.current = null
  }, [])

  const cleanupShow = useCallback(() => {
    showCleanupRef.current?.()
    showCleanupRef.current = null
  }, [])

  const load = useCallback(() => {
    cleanupLoad()
    isLoadedRef.current = false

    if (!enabled) {
      setStatus('idle')
      return
    }

    if (!isFullScreenAdSupported()) {
      setStatus('unsupported')
      return
    }

    const generation = loadGenerationRef.current
    setStatus('loading')

    try {
      loadCleanupRef.current = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (
            generation !== loadGenerationRef.current ||
            event.type !== 'loaded'
          ) {
            return
          }

          isLoadedRef.current = true
          setStatus('ready')
        },
        onError: (error) => {
          if (generation !== loadGenerationRef.current) {
            return
          }

          isLoadedRef.current = false
          setStatus('error')
          reportAdError('전체 화면 광고를 불러오지 못했어요:', error)
        },
      })
    } catch (error) {
      isLoadedRef.current = false
      setStatus('error')
      reportAdError('전체 화면 광고 로드를 시작하지 못했어요:', error)
    }
  }, [adGroupId, cleanupLoad, enabled])

  useEffect(() => {
    if (enabled) {
      load()
    } else {
      cleanupLoad()
      cleanupShow()
      isLoadedRef.current = false
      setStatus('idle')
    }

    return () => {
      cleanupLoad()
      cleanupShow()
      isLoadedRef.current = false
    }
  }, [cleanupLoad, cleanupShow, enabled, load])

  const show = useCallback(async (): Promise<FullScreenAdResult> => {
    if (
      !enabled ||
      !isLoadedRef.current ||
      !isFullScreenAdSupported()
    ) {
      return 'unavailable'
    }

    cleanupLoad()
    cleanupShow()
    isLoadedRef.current = false
    setStatus('showing')

    return new Promise<FullScreenAdResult>((resolve) => {
      let didEarnReward = false
      let didSettle = false

      const settle = (result: FullScreenAdResult) => {
        if (didSettle) {
          return
        }

        didSettle = true
        cleanupShow()
        setStatus(result === 'failed' ? 'error' : 'idle')
        resolve(result)
      }

      try {
        showCleanupRef.current = showFullScreenAd({
          options: { adGroupId },
          onEvent: (event) => {
            if (event.type === 'userEarnedReward') {
              didEarnReward = true
              return
            }

            if (event.type === 'dismissed') {
              settle(didEarnReward ? 'rewarded' : 'dismissed')
              return
            }

            if (event.type === 'failedToShow') {
              settle('failed')
            }
          },
          onError: (error) => {
            reportAdError('전체 화면 광고를 표시하지 못했어요:', error)
            settle('failed')
          },
        })
      } catch (error) {
        reportAdError('전체 화면 광고 표시를 시작하지 못했어요:', error)
        settle('failed')
      }
    })
  }, [adGroupId, cleanupLoad, cleanupShow, enabled])

  return {
    status,
    load,
    show,
  }
}

export function TossBannerAd() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [renderState, setRenderState] = useState<
    'loading' | 'rendered' | 'empty' | 'unsupported'
  >('loading')

  useEffect(() => {
    let isDisposed = false
    let attachedBanner: { destroy: () => void } | null = null

    try {
      if (
        !TossAds.initialize.isSupported() ||
        !TossAds.attachBanner.isSupported()
      ) {
        setRenderState('unsupported')
        return
      }
    } catch {
      setRenderState('unsupported')
      return
    }

    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          if (isDisposed || !containerRef.current) {
            return
          }

          attachedBanner = TossAds.attachBanner(
            AD_GROUP_IDS.banner,
            containerRef.current,
            {
              theme: 'light',
              tone: 'blackAndWhite',
              variant: 'expanded',
              callbacks: {
                onAdRendered: () => {
                  setRenderState('rendered')
                  trackEvent('face_result_banner_rendered')
                },
                onAdViewable: () => {
                  trackImpression('face_result_banner_viewable')
                },
                onAdClicked: () => {
                  trackEvent('face_result_banner_clicked')
                },
                onNoFill: () => {
                  setRenderState('empty')
                },
                onAdFailedToRender: (payload) => {
                  setRenderState('empty')
                  reportAdError(
                    '배너 광고를 표시하지 못했어요:',
                    payload.error,
                  )
                },
              },
            },
          )
        },
        onInitializationFailed: (error) => {
          setRenderState('empty')
          reportAdError('배너 광고 SDK를 초기화하지 못했어요:', error)
        },
      },
    })

    return () => {
      isDisposed = true
      attachedBanner?.destroy()
    }
  }, [])

  if (renderState === 'unsupported') {
    return null
  }

  return (
    <aside
      className={`toss-banner-ad toss-banner-ad--${renderState}`}
      aria-label="광고"
      aria-hidden={renderState !== 'rendered'}
    >
      <div ref={containerRef} className="toss-banner-ad__slot" />
    </aside>
  )
}
