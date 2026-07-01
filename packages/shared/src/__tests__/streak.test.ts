import { describe, it, expect } from 'vitest'
import { computeStreaks } from '../streak'

describe('computeStreaks', () => {
  it('matches the spec example (current=3, longest=10)', () => {
    const days = [
      '2026-06-28', '2026-06-29', '2026-06-30', // current run, today not yet reviewed
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
      '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', // run of 10
    ]
    expect(computeStreaks(days, '2026-07-01')).toEqual({ current: 3, longest: 10 })
  })

  it('current stays alive when today is not yet reviewed', () => {
    expect(computeStreaks(['2026-06-29', '2026-06-30'], '2026-07-01')).toEqual({ current: 2, longest: 2 })
  })

  it('current counts today when today is reviewed', () => {
    expect(computeStreaks(['2026-06-30', '2026-07-01'], '2026-07-01')).toEqual({ current: 2, longest: 2 })
  })

  it('current is 0 when neither today nor yesterday reviewed', () => {
    expect(computeStreaks(['2026-06-01'], '2026-07-01')).toEqual({ current: 0, longest: 1 })
  })

  it('a missed day breaks the run', () => {
    // gap on 06-29 splits into runs of 1 and 2
    expect(computeStreaks(['2026-06-28', '2026-06-30', '2026-07-01'], '2026-07-01')).toEqual({ current: 2, longest: 2 })
  })

  it('single day', () => {
    expect(computeStreaks(['2026-07-01'], '2026-07-01')).toEqual({ current: 1, longest: 1 })
  })

  it('all-empty', () => {
    expect(computeStreaks([], '2026-07-01')).toEqual({ current: 0, longest: 0 })
  })
})
