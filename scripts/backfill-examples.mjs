// One-time backfill: fill missing `example` on existing vocab_entries from the
// dictionary API. Uses the service_role key to bypass RLS across all rows.
// Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/backfill-examples.mjs
// Safe to re-run — only touches rows whose definition has no example.
import { createClient } from '@supabase/supabase-js'

const URL = 'https://abqfnjodchdjeburhqpb.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Settings → API → service_role).')
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

// Same scan as lookupWord: first non-empty example across all entries/meanings/defs.
async function fetchExample(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`)
    if (!res.ok) return undefined
    const data = await res.json()
    return data
      .flatMap((e) => e.meanings ?? [])
      .flatMap((m) => m.definitions ?? [])
      .find((d) => d.example)?.example
  } catch {
    return undefined
  }
}

const { data: rows, error } = await supabase.from('vocab_entries').select('id, word, definition')
if (error) throw error

const missing = rows.filter((r) => !r.definition?.example)
console.log(`${rows.length} entries, ${missing.length} missing example`)

let filled = 0
for (const row of missing) {
  const example = await fetchExample(row.word)
  if (!example) { console.log(`  – ${row.word}: no example in API`); continue }
  const { error: upErr } = await supabase
    .from('vocab_entries')
    .update({ definition: { ...row.definition, example } })
    .eq('id', row.id)
  if (upErr) { console.log(`  ! ${row.word}: ${upErr.message}`); continue }
  filled++
  console.log(`  ✓ ${row.word}: "${example}"`)
}

console.log(`\nFilled ${filled}/${missing.length}.`)
