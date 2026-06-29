// mw-lookup — thin Supabase Edge Function proxy for the Merriam-Webster
// Learner's Dictionary. It injects the MW_API_KEY secret (never shipped to any
// client build), calls M-W, and returns M-W's JSON verbatim. All parsing lives
// in @dictionary/shared, so this function only changes when the key or CORS
// policy changes.
//
// Auth: Supabase's gateway verifies the caller's JWT (the anon key every surface
// already holds) before the request reaches this function — a request without a
// valid anon key is rejected with 401 upstream, so no in-function key check is
// needed.

const MW_BASE = 'https://www.dictionaryapi.com/api/v3/references/learners/json'

// ponytail: reflect the request Origin instead of hardcoding origins — the
// chrome-extension:// id differs per build (dev/prod) and the function is
// already anon-key gated. Falls back to '*' for non-CORS callers.
function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const word = new URL(req.url).searchParams.get('word')?.trim()
  if (!word) {
    return new Response(JSON.stringify({ error: 'missing word' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const key = Deno.env.get('MW_API_KEY')
  if (!key) {
    return new Response(JSON.stringify({ error: 'MW_API_KEY not configured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const mwRes = await fetch(
      `${MW_BASE}/${encodeURIComponent(word)}?key=${encodeURIComponent(key)}`,
    )
    if (!mwRes.ok) {
      return new Response(JSON.stringify({ error: 'mw upstream error' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const body = await mwRes.text()
    return new Response(body, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'mw fetch failed' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
