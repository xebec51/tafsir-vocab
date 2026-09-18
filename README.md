# TafsirVocab

TafsirVocab is a Duolingo-inspired Qur'anic vocabulary trainer for **English Tafsir preparation**. The first complete course target is **Juz 14**, divided into **20 Mushaf-page units (262–281)**.

The core learning direction is deliberately:

> **Qur'anic Arabic → English**

Indonesian is shown only as a secondary helper. The goal is to make English retrieval direct enough for MTQ Tafsir speaking, not to memorize Arabic → Indonesian → English chains.

## What the MVP includes

- 20-unit Juz 14 learning path
- page metadata derived from Qur'an data, not guessed manually
- micro-lessons of up to 6 core words
- vocabulary cards with Arabic, English, Indonesian helper, root/POS when available
- word pronunciation playback when Quran Foundation returns word audio
- Arabic → English multiple choice
- English → Arabic recognition
- matching exercise
- word-in-ayah context questions
- open English typing recall
- XP and daily streak
- per-word mastery states
- spaced repetition
- weak-word/error bank
- page completion and mastery stars
- English Tafsir self-explanation mode
- account-based progress with secure database-backed sessions
- anonymous per-browser progress that is claimed when an account is created
- PostgreSQL persistence for deployment
- Quran Foundation OAuth2 client-credentials integration
- optional Qur'anic morphology enrichment and human curation pipeline
- setup/health diagnostics at `/setup`

## Learning model

```text
Juz 14
└── Page / Unit
    └── Lesson (≤ 6 core words)
        ├── Learn cards
        ├── Match
        ├── Arabic → English
        ├── English → Arabic
        ├── Context
        └── Typing recall

Attempts
└── WordProgress
    ├── NEW
    ├── LEARNING
    ├── FAMILIAR
    ├── STRONG
    └── MASTERED
        ↓
    Spaced review
        ↓
    English Tafsir practice
```

Failed retrievals are scheduled for a short retry (~10 minutes). Successful retrievals begin at 1 day, then 3 days, then expand according to the SRS ease factor.

## Data model

A **word occurrence** and a **learned lexeme** are intentionally separate:

```text
Page
└── WordOccurrence ──────→ Lexeme
                            │
Learner ────────────────────┤
├── WordProgress ───────────┤
├── PageProgress            │
└── Attempt ────────────────┘
```

This means Qur'anic surface forms such as `قَالَ`, `وَقَالَ`, `قَالُوا`, and `يَقُولُونَ` can retain their exact ayah locations while eventually being grouped at a canonical lemma/root level.

## Requirements

- Node.js 22
- PostgreSQL (managed PostgreSQL such as Neon/Supabase works well for deployment)
- Quran Foundation Content API developer credentials

For a local PostgreSQL instance, a `docker-compose.yml` is included.

## 1. Environment

Copy the example:

```bash
cp .env.example .env
```

Set a PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/tafsir_vocab?sslmode=require"
```

For local Docker:

```bash
docker compose up -d
```

and use:

```env
DATABASE_URL="postgresql://tafsir:tafsir@localhost:5432/tafsir_vocab?schema=public"
```

### Quran Foundation

Create a backend/server application in the Quran Foundation Developer Console and keep the credentials server-side:

```env
QF_ENV="prelive"
QF_CLIENT_ID="..."
QF_CLIENT_SECRET="..."
```

New apps normally start in `prelive`. Change `QF_ENV` to `production` only when the corresponding production credentials/permissions are available.

TafsirVocab requests OAuth2 tokens on the backend, caches them until shortly before expiry, and retries once after an authentication failure.

## 2. Install and initialize

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

This creates the 20 Juz 14 page units.

## 3. Import Juz 14

```bash
npm run data:import:juz14
npm run data:stats
```

The import performs server-side Quran Foundation requests for Mushaf pages 262–281 in English and Indonesian and stores:

- exact word location
- Uthmani Arabic
- transliteration
- English source gloss
- Indonesian helper gloss
- ayah context
- word audio path when available
- real page/surah/ayah metadata

The imported English gloss remains **provisional course data** until curated.

## 4. Optional morphology enrichment

Place a legally obtained Quranic Arabic Corpus morphology file locally, for example:

```text
data/import/quranic-corpus-morphology-0.4.txt
```

`data/import/*` is gitignored.

Run:

```bash
npm run data:enrich:morphology -- data/import/quranic-corpus-morphology-0.4.txt
npm run data:stats
```

The script maps word locations to available lemma, root, and POS information and reassigns surface occurrences to canonical lemma records.

## 5. Apply human curation

Copy `data/juz14/curation.sample.json` to your own curation file and review primary/alternative English meanings.

```bash
npm run data:curate -- data/juz14/curation.json
```

Course statuses:

- `CORE` — actively drilled
- `SUPPORT` — grammatical/high-frequency context word

Review statuses:

- `PROVISIONAL` — machine-imported
- `REVIEWED` — checked by a human
- `FINAL` — approved course content

## 6. Run

```bash
npm run dev
```

Open:

- `/` — learning path/dashboard
- `/learn/14/1` — first unit
- `/review` — spaced repetition
- `/weak-words` — error bank
- `/tafsir-practice` — English Tafsir self-explanation
- `/setup` — deployment/data diagnostics

## Scripts

```text
npm run dev
npm run build
npm run typecheck
npm run test:core
npm run db:generate
npm run db:dev
npm run db:migrate
npm run db:seed
npm run data:import:juz14
npm run data:enrich:morphology -- <file>
npm run data:curate -- <file>
npm run data:stats
```

## Juz 14 mapping

| Unit | Mushaf page |
|---:|---:|
| 1 | 262 |
| 2 | 263 |
| 3 | 264 |
| 4 | 265 |
| 5 | 266 |
| 6 | 267 |
| 7 | 268 |
| 8 | 269 |
| 9 | 270 |
| 10 | 271 |
| 11 | 272 |
| 12 | 273 |
| 13 | 274 |
| 14 | 275 |
| 15 | 276 |
| 16 | 277 |
| 17 | 278 |
| 18 | 279 |
| 19 | 280 |
| 20 | 281 |

Surah and verse labels are populated from the imported page data. They are not hard-coded into the course.

## Production deployment

Recommended shape:

```text
Vercel / Node server
├── Next.js UI + API routes
├── secure account session + anonymous learner cookie
├── Quran Foundation OAuth/token calls (server only)
└── PostgreSQL (Neon / Supabase / equivalent)
```

Set these server environment variables in the deployment platform:

```text
DATABASE_URL
QF_ENV
QF_CLIENT_ID
QF_CLIENT_SECRET
```

Run database migration + seed + Juz import once against the production database before study use. Check `/setup` afterward; it should report 20 seeded pages and non-zero word occurrences.

## Account and privacy model

Users can study anonymously with a random `tv_learner` HTTP-only cookie. Creating an account claims that browser's progress; signing in later restores the same PostgreSQL-backed learner record across devices and deployments. Signing out rotates the anonymous identity so account progress is never reused by the logged-out browser.

Passwords are salted and hashed with scrypt. Login sessions use random tokens, store only token hashes in PostgreSQL, expire after 30 days, and are sent through `HttpOnly`, `SameSite=Lax`, production-only `Secure` cookies. API routes derive the learner from the session and never accept a client-supplied learner ID. Quran Foundation secrets remain server-side.

## Data-quality principle

Do **not** treat one word-by-word translation as the absolute lexical meaning of a Qur'anic word. TafsirVocab keeps source glosses separate from curated meanings so the course can distinguish:

1. source word-by-word gloss;
2. lexical core meaning;
3. contextual meaning in the ayah;
4. an English Tafsir explanation.

That distinction is central to the project.
