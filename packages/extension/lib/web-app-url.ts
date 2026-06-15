// The extension links out to the deployed standalone web app (its base URL
// comes from VITE_WEB_APP_URL). Keep the join logic pure so it's unit-testable.

export function joinWebAppUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return trimmed + suffix
}

const base = import.meta.env.VITE_WEB_APP_URL as string

export function vocabBankUrl(): string {
  return joinWebAppUrl(base, '/vocab')
}

export function reviewUrl(): string {
  return joinWebAppUrl(base, '/review')
}
