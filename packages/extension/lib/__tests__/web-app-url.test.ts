import { describe, it, expect } from 'vitest'
import { joinWebAppUrl } from '../web-app-url'

describe('joinWebAppUrl', () => {
  it('joins a base without a trailing slash', () => {
    expect(joinWebAppUrl('https://app.vercel.app', '/vocab')).toBe('https://app.vercel.app/vocab')
  })

  it('strips a trailing slash on the base', () => {
    expect(joinWebAppUrl('https://app.vercel.app/', '/review')).toBe('https://app.vercel.app/review')
  })

  it('strips multiple trailing slashes', () => {
    expect(joinWebAppUrl('http://localhost:5174///', '/vocab')).toBe('http://localhost:5174/vocab')
  })

  it('adds a leading slash to the path when missing', () => {
    expect(joinWebAppUrl('https://app.vercel.app', 'review')).toBe('https://app.vercel.app/review')
  })

  it('builds the extension login URL carrying the ext=1 marker', () => {
    expect(joinWebAppUrl('https://app.vercel.app', '/login?ext=1')).toBe('https://app.vercel.app/login?ext=1')
  })
})
