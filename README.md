# Dictionary

Look up English words while reading and build a cloud-synced vocab bank you can review as flashcards. A monolingual (EN→EN) dictionary for learning English *in* English — every saved word keeps the real sentence and article you found it in.

**Standalone web app (review on any device):** https://dictionary-extension.vercel.app — the extension's "Open Vocab Bank" / "Review" buttons open this deployed site.

## Packages

npm workspaces monorepo:

| Package | Path | Purpose |
|---------|------|---------|
| `@dictionary/shared` | `packages/shared/` | Shared types (`VocabEntry`, `Encounter`, `DefinitionData`) + review-session logic + dictionary lookup (`lookupWord`) + encounter merge (`mergeEncounters`) |
| `@dictionary/extension` | `packages/extension/` | Chrome extension (WXT + React) |
| `@dictionary/web` | `packages/web/` | PWA web app (React + Vite + Tailwind) |
| `dictionary-vocab` | `packages/raycast/` | Raycast extension — **Add Vocab** command (capture words from anywhere) |

Backend is Supabase (Postgres + Google OAuth + per-user RLS).

## User flow (Chrome extension)

Signing in is **required to save** — saved words sync to the cloud so you can review them anywhere.

1. **Install** the extension and click its toolbar icon.
2. The popup shows **Sign in with Google**. Click it → a Google OAuth window opens → consent → the window closes and the popup shows your vocab status.
3. **Look up a word:** select 1–3 words on any page → a popup shows the definition, part of speech, and an example.
   - Signed in → **Save to Vocab Bank** (records the word, the page URL, and the surrounding sentence).
   - Signed out → **Sign in with Google to save** (no anonymous local-only saving).
4. The toolbar popup (signed in) shows: **vocab count**, **Open Vocab Bank**, **Review →**, and **Sign out**. "Open Vocab Bank" and "Review →" open the deployed standalone web app (above) in a new tab.
5. **Vocab Bank (web app):** search, expand a word to see its definition + every encounter.
6. **Review (web app):** a session draws 10 random words; flip each flashcard and rate Easy / Hard / Again (Again loops back in the session).

The same word can be saved from multiple articles — each save appends an *encounter*, so review shows you every real sentence you met it in, not a generic example.

## Add Vocab from Raycast

The `packages/raycast/` extension adds a launcher-speed way to save a word from **anywhere** (not just the browser), writing to the same Supabase bank.

1. Run **Add Vocab** in Raycast.
2. Signed out → a **Sign in with Google** screen; press Enter to run OAuth.
3. Type a word → it's looked up in the same dictionary → a preview shows the definition.
4. **Enter** saves it. "Add with sentence…" optionally attaches an example sentence. Already-saved words show an "Already saved" hint and just append a new encounter.

Manually-added words record a `raycast://manual` encounter, so the web bank labels them **"Added in Raycast"** instead of a source link.

**Run it:** `cd packages/raycast && npm run dev` (needs the Raycast app + a Raycast account). Set the **Supabase Anon Key** in the command's preferences, and add `https://raycast.com/redirect*` to Supabase → Auth → URL Configuration → **Redirect URLs**. See `CLAUDE.md` for the OAuth gotchas.

### Where sign-in lives

Sign-in is reachable from the **toolbar popup**, the **in-page definition popup**, and the **web app** (which keeps its own session). The toolbar popup runs OAuth directly; the in-page popup delegates to a background service worker (content scripts can't use `chrome.identity`); the web app signs in separately (one-time per browser). The extension no longer ships internal bank/review pages — the deployed web app is the single bank/review surface, and JSON export/import has been retired.

## Develop & build

```bash
# Build all packages from the repo root
npm run build

# Extension only
npm run build --workspace=@dictionary/extension
npm test  --workspace=@dictionary/extension

# Shared logic tests (lookupWord, mergeEncounters)
npm test  --workspace=@dictionary/shared

# Web app dev server
cd packages/web && npm run dev -- --port 5174

# Raycast extension (dev)
cd packages/raycast && npm run dev
```

**Loading the extension:** after building, go to `chrome://extensions` (Developer mode on) → **Load unpacked** → select `packages/extension/.output/chrome-mv3`. After a rebuild, click the card's reload icon. (Always load from the package's `.output` — not any stale `.output` at the repo root.)

### Environment variables

Both `packages/extension/.env` and `packages/web/.env` need:

```
VITE_SUPABASE_URL=https://abqfnjodchdjeburhqpb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
```

The Raycast extension (`packages/raycast/`) doesn't use `.env` — it reads the **Supabase URL** (defaulted) and **Anon Key** from its Raycast command **preferences** instead.

## Conventions

This project uses [Spectra](https://github.com/) spec-driven development — specs in `openspec/specs/`, change proposals in `openspec/changes/`. See `CLAUDE.md` for architecture details and hard-won gotchas (OAuth redirect URIs, the OAuth nonce, shadow-DOM styling, etc.).
