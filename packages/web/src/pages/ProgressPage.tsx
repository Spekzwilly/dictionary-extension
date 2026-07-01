import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { computeStreaks } from '@dictionary/shared'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const WEEKS = 53
const DAY_MS = 86_400_000

// Fixed intensity buckets (see spec). 0 → blank, then 1–4 / 5–9 / 10–19 / 20+.
function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count <= 4) return 1
  if (count <= 9) return 2
  if (count <= 19) return 3
  return 4
}

const LEVEL_CLASS = [
  'bg-gray-100',
  'bg-indigo-200',
  'bg-indigo-300',
  'bg-indigo-500',
  'bg-indigo-700',
]

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

// Trailing 53-week grid ending this week, laid out as columns of 7 days
// (Sunday→Saturday), oldest column first — the GitHub contribution layout.
function buildGrid(today: string): string[] {
  const [y, m, d] = today.split('-').map(Number)
  const todayMs = Date.UTC(y, m - 1, d)
  const todayWeekday = new Date(todayMs).getUTCDay() // 0 = Sunday
  const startMs = todayMs - todayWeekday * DAY_MS - (WEEKS - 1) * 7 * DAY_MS
  return Array.from({ length: WEEKS * 7 }, (_, i) => dayString(startMs + i * DAY_MS))
}

export default function ProgressPage() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('review_activity')
      .select('day, card_count')
      .then(({ data }) => {
        const map: Record<string, number> = {}
        for (const row of data ?? []) map[row.day as string] = row.card_count as number
        setCounts(map)
        setLoading(false)
      })
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-CA')
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  const days = buildGrid(today)
  const activeDays = Object.keys(counts).filter(day => counts[day] > 0)
  const { current, longest } = computeStreaks(activeDays, today)
  const isEmpty = activeDays.length === 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4 pb-20">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Progress</h1>
            <p className="text-sm text-gray-400">Your review consistency</p>
          </div>
          <Link to="/vocab" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            ← Vocab bank
          </Link>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Current streak</p>
            <p className="text-2xl font-semibold text-gray-900">{current} <span className="text-sm font-normal text-gray-400">day{current === 1 ? '' : 's'}</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Longest streak</p>
            <p className="text-2xl font-semibold text-gray-900">{longest} <span className="text-sm font-normal text-gray-400">day{longest === 1 ? '' : 's'}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
            {days.map(day => {
              const future = Date.parse(`${day}T00:00:00Z`) > todayMs
              return (
                <div
                  key={day}
                  title={future ? undefined : `${day}: ${counts[day] ?? 0} reviewed`}
                  className={cn(
                    'w-3 h-3 rounded-sm',
                    future ? 'bg-transparent' : LEVEL_CLASS[level(counts[day] ?? 0)],
                  )}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 justify-end">
            <span>Less</span>
            {LEVEL_CLASS.map((c, i) => <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />)}
            <span>More</span>
          </div>
        </div>

        {isEmpty && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400 mb-2">No reviews yet — your graph is waiting.</p>
            <Link to="/review" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Start reviewing →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
