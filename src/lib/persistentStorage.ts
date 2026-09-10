import { Storage } from '@apps-in-toss/web-framework'

export const PERSISTENT_STORAGE_KEYS = [
  'gwansang-log:reading-history',
  'gwansang-log:daily-actions',
  'gwansang-log:rewarded-detail-unlocks',
  'summer-ping:last-applied-at',
  'summer-ping:last-applied-at-owner',
  'summer-ping:application-history',
] as const

const cache = new Map<string, string>()

function getBrowserItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setBrowserItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private browsing or restricted WebViews may reject browser storage.
  }
}

export async function initializePersistentStorage() {
  await Promise.all(
    PERSISTENT_STORAGE_KEYS.map(async (key) => {
      const browserValue = getBrowserItem(key)

      try {
        const nativeValue = await Storage.getItem(key)
        if (nativeValue !== null) {
          cache.set(key, nativeValue)
          return
        }

        if (browserValue !== null) {
          cache.set(key, browserValue)
          await Storage.setItem(key, browserValue)
          return
        }
      } catch {
        // Fall back to the browser storage when the native bridge is unavailable.
      }

      if (browserValue !== null) {
        cache.set(key, browserValue)
      }
    }),
  )
}

export function getPersistentItem(key: string) {
  return cache.has(key) ? cache.get(key) ?? null : getBrowserItem(key)
}

export function setPersistentItem(key: string, value: string) {
  cache.set(key, value)
  setBrowserItem(key, value)
  void Storage.setItem(key, value).catch(() => {
    // The browser fallback has already received the value.
  })
}
