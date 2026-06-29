import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupWord, normalizeDefinition } from '../dictionary'
import type { WordDefinition } from '../types'

const MW_PROXY = 'https://x.supabase.co/functions/v1/mw-lookup'

// A realistic M-W Learner's payload: one entry, three senses (two with example
// `vis` blocks, one text-only), plus an unknown sseq node type to be skipped.
const MOCK_MW = [
  {
    hwi: { hw: 'happy' },
    fl: 'adjective',
    def: [
      {
        sseq: [
          [
            [
              'sense',
              {
                sn: '1',
                dt: [
                  ['text', '{bc}feeling or showing pleasure '],
                  ['vis', [{ t: 'a {it}happy{/it} child' }, { t: "I'm so {it}happy{/it} to see you." }]],
                ],
              },
            ],
          ],
          [
            [
              'sense',
              {
                sn: '2',
                dt: [
                  ['text', '{bc}lucky or fortunate '],
                  ['vis', [{ t: 'a {it}happy{/it} coincidence' }]],
                ],
              },
            ],
            ['xyz_unknown_node', { foo: 'bar' }],
          ],
          [
            [
              'sense',
              {
                sn: '3',
                dt: [['text', '{bc}willing to do something ']],
              },
            ],
          ],
        ],
      },
    ],
  },
]

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

  it('populates senses on the dictionaryapi.dev fallback with a backfilled example', async () => {
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
                { definition: 'a third sense', example: 'the ephemeral joys of childhood' },
              ],
            },
          ],
        },
      ],
    }))

    const result = await lookupWord('ephemeral')
    if ('type' in result) throw new Error('expected definition')
    expect(result.senses).toEqual([
      { definition: 'lasting a very short time', examples: ['the ephemeral joys of childhood'] },
    ])
  })
})

describe('lookupWord with Merriam-Webster proxy', () => {
  it('parses an M-W multi-sense entry, skipping unknown node types', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_MW,
    }))

    const result = await lookupWord('happy', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    if ('type' in result) throw new Error('expected definition')
    expect(result.partOfSpeech).toBe('adjective')
    expect(result.senses).toHaveLength(3)
    expect(result.senses[0]).toEqual({
      definition: 'feeling or showing pleasure',
      examples: ['a happy child', "I'm so happy to see you."],
    })
    expect(result.senses[1].examples).toEqual(['a happy coincidence'])
    // A sense without `vis` carries no examples.
    expect(result.senses[2].examples).toBeUndefined()
  })

  it('calls the proxy at <mwProxyUrl>?word= with the anon key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_MW,
    })
    vi.stubGlobal('fetch', fetchMock)

    await lookupWord('happy', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon-key' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${MW_PROXY}?word=happy`)
    expect(init.headers.apikey).toBe('anon-key')
    expect(init.headers.Authorization).toBe('Bearer anon-key')
  })

  it('falls back to dictionaryapi.dev when M-W returns suggestions', async () => {
    const fetchMock = vi.fn()
      // M-W not-found → array of suggestion strings
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ['happy', 'harpy'] })
      // dictionaryapi.dev hit
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => MOCK_VALID })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupWord('ephemeral', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    if ('type' in result) throw new Error('expected definition')
    expect(result.senses[0].definition).toBe('Lasting for a very short time.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('skips M-W entirely when no mwProxyUrl is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_VALID,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupWord('ephemeral')
    if ('type' in result) throw new Error('expected definition')
    // Only the fallback was hit; the proxy URL never appears.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('dictionaryapi.dev')
  })

  it('returns NotFound when both M-W and the fallback miss', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ['xyz'] })
      .mockResolvedValueOnce({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupWord('xyznonexistent', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    expect(result).toEqual({ type: 'not-found', word: 'xyznonexistent' })
  })

  it('caps the number of senses returned from M-W', async () => {
    const manySenses = Array.from({ length: 20 }, (_, i) => [
      'sense',
      { dt: [['text', `{bc}sense ${i} `]] },
    ])
    const fixture = [
      {
        meta: { id: 'run', stems: ['run'] },
        hwi: { hw: 'run' },
        fl: 'verb',
        def: [{ sseq: [manySenses] }],
      },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fixture,
    }))

    const result = await lookupWord('run', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    if ('type' in result) throw new Error('expected definition')
    expect(result.senses).toHaveLength(6)
  })

  it('ignores M-W entries that are not about the looked-up word (phrases, idioms)', async () => {
    // M-W returns the headword plus phrase/idiom entries where the word only
    // appears in a stem — only the headword's senses should survive.
    const polluted = [
      {
        meta: { id: 'happy', stems: ['happy', 'happier', 'happiest'] },
        hwi: { hw: 'hap*py' },
        fl: 'adjective',
        def: [{ sseq: [[['sense', { dt: [['text', '{bc}feeling pleasure ']] }]]] }],
      },
      {
        meta: { id: 'happy hour', stems: ['happy hour', 'happy hours'] },
        hwi: { hw: 'happy hour' },
        fl: 'noun',
        def: [{ sseq: [[['sense', { dt: [['text', '{bc}a period at a bar ']] }]]] }],
      },
      {
        meta: { id: 'clam:1', stems: ['clam', '(as) happy as a clam'] },
        hwi: { hw: 'clam' },
        fl: 'noun',
        def: [{ sseq: [[['sense', { dt: [['text', '{bc}a kind of shellfish ']] }]]] }],
      },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => polluted,
    }))

    const result = await lookupWord('happy', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    if ('type' in result) throw new Error('expected definition')
    expect(result.partOfSpeech).toBe('adjective')
    expect(result.senses).toHaveLength(1)
    expect(result.senses[0].definition).toBe('feeling pleasure')
  })

  it('falls back when the proxy returns a non-2xx response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => MOCK_VALID })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupWord('ephemeral', { mwProxyUrl: MW_PROXY, mwApiKey: 'anon' })
    if ('type' in result) throw new Error('expected definition')
    expect(result.senses[0].definition).toBe('Lasting for a very short time.')
  })
})

describe('normalizeDefinition', () => {
  it('synthesizes a one-element senses array from legacy fields', () => {
    const legacy = {
      word: 'ephemeral',
      partOfSpeech: 'adjective',
      definition: 'lasting a very short time',
      example: 'the ephemeral joys of childhood',
    } as unknown as WordDefinition // old stored shape lacks `senses`

    const result = normalizeDefinition(legacy)
    expect(result.senses).toEqual([
      { definition: 'lasting a very short time', examples: ['the ephemeral joys of childhood'] },
    ])
  })

  it('omits examples when the legacy entry has no example', () => {
    const legacy = {
      word: 'plain',
      partOfSpeech: 'adjective',
      definition: 'simple',
    } as unknown as WordDefinition

    const result = normalizeDefinition(legacy)
    expect(result.senses).toEqual([{ definition: 'simple', examples: undefined }])
  })

  it('leaves an already-normalized definition untouched', () => {
    const def: WordDefinition = {
      word: 'happy',
      partOfSpeech: 'adjective',
      senses: [{ definition: 'glad', examples: ['a happy child'] }],
    }
    expect(normalizeDefinition(def)).toBe(def)
  })
})
