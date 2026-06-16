import { describe, it, expect } from 'vitest'
import { mergeEncounters } from '../encounters'
import type { Encounter } from '../types'

const enc = (savedAt: number): Encounter => ({
  url: 'https://example.com',
  sentence: `sentence ${savedAt}`,
  savedAt,
})

describe('mergeEncounters', () => {
  it('appends every incoming encounter when existing is empty', () => {
    const result = mergeEncounters([], [enc(1), enc(2)])
    expect(result.map((e) => e.savedAt)).toEqual([1, 2])
  })

  it('does not duplicate an incoming encounter that shares a savedAt with an existing one', () => {
    const result = mergeEncounters([enc(1), enc(2)], [enc(2), enc(3)])
    expect(result.map((e) => e.savedAt)).toEqual([1, 2, 3])
  })

  it('appends multiple new encounters preserving existing order', () => {
    const result = mergeEncounters([enc(10)], [enc(20), enc(30)])
    expect(result.map((e) => e.savedAt)).toEqual([10, 20, 30])
  })

  it('does not mutate the input arrays', () => {
    const existing = [enc(1)]
    const incoming = [enc(2)]
    mergeEncounters(existing, incoming)
    expect(existing.map((e) => e.savedAt)).toEqual([1])
    expect(incoming.map((e) => e.savedAt)).toEqual([2])
  })
})
