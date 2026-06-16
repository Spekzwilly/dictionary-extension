import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupWord } from '../dictionary'

const MOCK_VALID = [
  {
    word: 'ephemeral',
    meanings: [
      {
        partOfSpeech: 'adjective',
        definitions: [
          {
            definition: 'Lasting for a very short time.',
            example: 'The ephemeral beauty of cherry blossoms.',
          },
        ],
      },
    ],
  },
]

afterEach(() => vi.restoreAllMocks())

describe('lookupWord', () => {
  it('returns WordDefinition shape for a valid word', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_VALID,
    }))

    const result = await lookupWord('ephemeral')
    expect(result).toMatchObject({
      word: 'ephemeral',
      partOfSpeech: 'adjective',
      definition: 'Lasting for a very short time.',
      example: 'The ephemeral beauty of cherry blossoms.',
    })
    expect('type' in result).toBe(false)
  })

  it('returns NotFound when API responds with 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }))

    const result = await lookupWord('xyznonexistent')
    expect(result).toEqual({ type: 'not-found', word: 'xyznonexistent' })
  })

  it('returns NotFound on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')))

    const result = await lookupWord('anything')
    expect(result).toEqual({ type: 'not-found', word: 'anything' })
  })

  it('returns NotFound for malformed API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }))

    const result = await lookupWord('weird')
    expect(result).toEqual({ type: 'not-found', word: 'weird' })
  })
})
