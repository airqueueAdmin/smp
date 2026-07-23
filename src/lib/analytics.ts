import { Analytics } from '@apps-in-toss/web-framework'

type AnalyticsValue = string | number | boolean | null | undefined
type AnalyticsParams = Record<string, AnalyticsValue>

function reportAnalyticsError(error: unknown) {
  if (import.meta.env.DEV) {
    console.warn('Apps in Toss analytics logging failed:', error)
  }
}

function safelyLog(operation: () => Promise<void> | undefined) {
  try {
    const result = operation()
    if (result) {
      void result.catch(reportAnalyticsError)
    }
  } catch (error) {
    reportAnalyticsError(error)
  }
}

export function getAcquisitionReferrer(search = window.location.search) {
  const searchParams = new URLSearchParams(search)
  return searchParams.get('referrer') ?? searchParams.get('source') ?? 'direct'
}

export function trackScreen(logName: string, params: AnalyticsParams = {}) {
  safelyLog(() =>
    Analytics.screen({
      log_name: logName,
      referrer: getAcquisitionReferrer(),
      ...params,
    }),
  )
}

export function trackEvent(logName: string, params: AnalyticsParams = {}) {
  safelyLog(() =>
    Analytics.click({
      log_name: logName,
      referrer: getAcquisitionReferrer(),
      ...params,
    }),
  )
}

export function trackImpression(logName: string, params: AnalyticsParams = {}) {
  safelyLog(() =>
    Analytics.impression({
      log_name: logName,
      referrer: getAcquisitionReferrer(),
      ...params,
    }),
  )
}
