import { describe, it, expect, vi, afterEach } from 'vitest'
import { pronounce, canPronounce } from '../pronounce'

// Fake <audio>: URLs containing "bad" emit 'error', others 'ended'.
class FakeAudio {
  url: string
  private listeners: Record<string, () => void> = {}
  constructor(url: string) {
    this.url = url
  }
  addEventListener(ev: string, cb: () => void) {
    this.listeners[ev] = cb
  }
  play() {
    queueMicrotask(() => {
      if (this.url.includes('bad')) this.listeners.error?.()
      else this.listeners.ended?.()
    })
    return Promise.resolve()
  }
}

function withTts() {
  const speak = vi.fn()
  vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn(), speak } })
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = ''
    constructor(public text: string) {}
  })
  return speak
}

function withoutTts() {
  vi.stubGlobal('window', {})
}

afterEach(() => vi.restoreAllMocks())

describe('pronounce resolution order', () => {
  it('plays chosen-accent audio and does not use TTS', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const speak = withTts()

    const outcome = await pronounce(
      { word: 'hello', audio: { us: 'us.mp3', uk: 'uk.mp3' } },
      'us'
    )
    expect(outcome).toBe('audio')
    expect(speak).not.toHaveBeenCalled()
  })

  it('falls back to the other accent when chosen is absent', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    withTts()

    const outcome = await pronounce({ word: 'hello', audio: { uk: 'uk.mp3' } }, 'us')
    expect(outcome).toBe('audio')
  })

  it('falls through a failing chosen-accent URL to the other accent', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    withTts()

    const outcome = await pronounce(
      { word: 'hello', audio: { us: 'us-bad.mp3', uk: 'uk.mp3' } },
      'us'
    )
    expect(outcome).toBe('audio')
  })

  it('uses TTS when no audio exists', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const speak = withTts()

    const outcome = await pronounce({ word: 'hello' }, 'us')
    expect(outcome).toBe('tts')
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('is unavailable when no audio and no TTS', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    withoutTts()

    const outcome = await pronounce({ word: 'hello' }, 'us')
    expect(outcome).toBe('unavailable')
  })
})

describe('canPronounce', () => {
  it('true when audio exists even without TTS', () => {
    withoutTts()
    expect(canPronounce({ audio: { uk: 'uk.mp3' } })).toBe(true)
  })

  it('true when TTS exists without audio', () => {
    withTts()
    expect(canPronounce({})).toBe(true)
  })

  it('false when neither audio nor TTS', () => {
    withoutTts()
    expect(canPronounce({})).toBe(false)
  })
})
