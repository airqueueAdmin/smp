export type SuncareRecordSource = 'home' | 'start' | 'reapply'

export type SuncareRecord = {
  id: string
  appliedAt: string
  source: SuncareRecordSource
}

export const LAST_APPLIED_AT_KEY = 'summer-ping:last-applied-at'
export const LAST_APPLIED_AT_OWNER_KEY = 'summer-ping:last-applied-at-owner'

const HISTORY_KEY = 'summer-ping:application-history'
const MAX_HISTORY_LENGTH = 30

function isSuncareRecord(value: unknown): value is SuncareRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<SuncareRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.appliedAt === 'string' &&
    !Number.isNaN(new Date(record.appliedAt).getTime()) &&
    (record.source === 'home' || record.source === 'start' || record.source === 'reapply')
  )
}

export function getLastAppliedAt() {
  const value = window.localStorage.getItem(LAST_APPLIED_AT_KEY) ?? ''
  return value && !Number.isNaN(new Date(value).getTime()) ? value : ''
}

export function getSuncareHistory() {
  const raw = window.localStorage.getItem(HISTORY_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSuncareRecord).slice(0, MAX_HISTORY_LENGTH) : []
  } catch {
    return []
  }
}

export function recordSuncareApplication({
  appliedAt = new Date().toISOString(),
  source,
  ownerKey,
}: {
  appliedAt?: string
  source: SuncareRecordSource
  ownerKey?: string
}) {
  const record: SuncareRecord = {
    id: `${appliedAt}:${source}`,
    appliedAt,
    source,
  }
  const history = [record, ...getSuncareHistory().filter((item) => item.id !== record.id)].slice(
    0,
    MAX_HISTORY_LENGTH,
  )

  window.localStorage.setItem(LAST_APPLIED_AT_KEY, appliedAt)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))

  if (ownerKey) {
    window.localStorage.setItem(LAST_APPLIED_AT_OWNER_KEY, ownerKey)
  }

  window.dispatchEvent(new CustomEvent('summer-ping:recorded', { detail: record }))
  return record
}
