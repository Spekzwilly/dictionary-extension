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

  it('backfills example from a later definition when the first has none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          word: 'ephemeral',
          meanings: [
            {
              partOfSpeech: 'adjective',
              definitions: [
                { definition: 'lasting a very short time' },
                { definition: 'another sense' },
                { definition: 'a third sense', example: 'the ephemeral joys of childhood' },
              ],
            },
          ],
        },
      ],
    }))

    const result = await lookupWord('ephemeral')
    if ('type' in result) throw new Error('expected definition')
    expect(result.definition).toBe('lasting a very short time')
    expect(result.example).toBe('the ephemeral joys of childhood')
  })

  it('leaves example undefined when no definition has one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          word: 'plain',
          meanings: [
            {
              partOfSpeech: 'adjective',
              definitions: [{ definition: 'a' }, { definition: 'b' }],
            },
          ],
        },
      ],
    }))

    const result = await lookupWord('plain')
    if ('type' in result) throw new Error('expected definition')
    expect(result.example).toBeUndefined()
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

  function mockEntry(phonetics: Array<{ text?: string; audio?: string }>) {
    return [
      {
        word: 'hello',
        phonetics,
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A greeting.' }],
          },
        ],
      },
    ]
  }

  function stubFetch(body: unknown) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    }))
  }

  it('maps both US and UK audio by URL suffix', async () => {
    stubFetch(mockEntry([
      { audio: 'https://x/hello-us.mp3' },
      { audio: 'https://x/hello-uk.mp3' },
    ]))

    const result = await lookupWord('hello')
    expect('type' in result).toBe(false)
    if ('type' in result) return
    expect(result.audio).toEqual({
      us: 'https://x/hello-us.mp3',
      uk: 'https://x/hello-uk.mp3',
    })
  })

  it('keeps only the present accent when one is missing', async () => {
    stubFetch(mockEntry([{ audio: 'https://x/hello-uk.mp3' }]))

    const result = await lookupWord('hello')
    if ('type' in result) throw new Error('expected definition')
    expect(result.audio).toEqual({ uk: 'https://x/hello-uk.mp3' })
    expect(result.audio?.us).toBeUndefined()
  })

  it('ignores unrecognized accent suffixes and empty audio, leaving audio undefined', async () => {
    stubFetch(mockEntry([
      { audio: 'https://x/hello-au.mp3' },
      { audio: 'https://x/hello.mp3' },
      { audio: '' },
    ]))

    const result = await lookupWord('hello')
    if ('type' in result) throw new Error('expected definition')
    expect(result.audio).toBeUndefined()
  })

  it('extracts the first non-empty IPA text as phonetic', async () => {
    stubFetch(mockEntry([
      { text: '', audio: 'https://x/hello-us.mp3' },
      { text: '/həˈloʊ/' },
    ]))

    const result = await lookupWord('hello')
    if ('type' in result) throw new Error('expected definition')
    expect(result.phonetic).toBe('/həˈloʊ/')
  })

  it('leaves audio and phonetic undefined when there are no phonetics', async () => {
    stubFetch(mockEntry([]))

    const result = await lookupWord('hello')
    if ('type' in result) throw new Error('expected definition')
    expect(result.audio).toBeUndefined()
    expect(result.phonetic).toBeUndefined()
  })
})
