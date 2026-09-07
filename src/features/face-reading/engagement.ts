export type DailyActionStats = {
  completedToday: boolean
  streak: number
  totalDays: number
  week: Array<{ date: string; completed: boolean; label: string }>
}

type DailyActionEntry = {
  date: string
  recordId: string
  completedAt: string
}

const DAILY_ACTIONS_KEY = 'gwansang-log:daily-actions'
const MAX_DAILY_ACTIONS = 90

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function isDailyActionEntry(value: unknown): value is DailyActionEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const entry = value as Partial<DailyActionEntry>
  return (
    typeof entry.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.recordId === 'string' &&
    typeof entry.completedAt === 'string'
  )
}

function getEntries() {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(DAILY_ACTIONS_KEY) ?? '[]',
    )

    return Array.isArray(value)
      ? value.filter(isDailyActionEntry).slice(0, MAX_DAILY_ACTIONS)
      : []
  } catch {
    return []
  }
}

export function getDailyActionStats(now = new Date()): DailyActionStats {
  const completedDates = new Set(getEntries().map((entry) => entry.date))
  const todayKey = toDateKey(now)
  const completedToday = completedDates.has(todayKey)
  let streak = 0
  let cursor = completedToday ? now : shiftDate(now, -1)

  while (completedDates.has(toDateKey(cursor))) {
    streak += 1
    cursor = shiftDate(cursor, -1)
  }

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(now, index - 6)
    const key = toDateKey(date)

    return {
      date: key,
      completed: completedDates.has(key),
      label: new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date),
    }
  })

  return {
    completedToday,
    streak,
    totalDays: completedDates.size,
    week,
  }
}

export function completeDailyAction(recordId: string, now = new Date()) {
  const todayKey = toDateKey(now)
  const nextEntry: DailyActionEntry = {
    date: todayKey,
    recordId,
    completedAt: now.toISOString(),
  }
  const entries = [
    nextEntry,
    ...getEntries().filter((entry) => entry.date !== todayKey),
  ]
    .sort((a, b) => fromDateKey(b.date).getTime() - fromDateKey(a.date).getTime())
    .slice(0, MAX_DAILY_ACTIONS)

  window.localStorage.setItem(DAILY_ACTIONS_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent('gwansang-log:daily-action-completed'))

  return getDailyActionStats(now)
}
