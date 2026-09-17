# TafsirVocab

A Duolingo-inspired Qur'anic vocabulary trainer designed for **English Tafsir preparation**.

The first course is **Juz 14**, divided into **20 page-based learning units** corresponding to Mushaf pages **262–281**.

## Learning principle

The primary association is:

**Qur'anic Arabic → English**

Indonesian is secondary assistance.

The app distinguishes:

- exact Qur'anic word occurrences,
- lemma-level vocabulary,
- root/morphology,
- source word-by-word gloss,
- curated English meaning,
- contextual meaning in the ayah.

## Stack

- Next.js 15 App Router
- TypeScript
- Prisma
- SQLite for local MVP
- Quran Foundation Content API for Qur'an content
- optional Quranic Arabic Corpus morphology enrichment
- spaced-repetition engine

SQLite is intentionally used for the starter. Move to PostgreSQL before production deployment.

## Run locally

```bash
cp .env.example .env
```

Fill:

```env
QF_CLIENT_ID="..."
QF_ACCESS_TOKEN="..."
```

Then:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run data:import:juz14
npm run data:stats
npm run dev
```

Open `http://localhost:3000`.

## Optional lemma/root enrichment

Do not commit a third-party morphology dump blindly.

Place your legally obtained Quranic Arabic Corpus morphology file locally:

```text
data/import/quranic-corpus-morphology-0.4.txt
```

Then:

```bash
npm run data:enrich:morphology -- data/import/quranic-corpus-morphology-0.4.txt
npm run data:stats
```

See `docs/DATA_PIPELINE.md`.

## Juz 14 structure

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

Surah names and ayah ranges are **not hard-coded**. The Juz 14 import derives them from the Qur'an page data.

## Data model

```text
Juz
└── Page
    └── WordOccurrence ──→ Lexeme

Learner
├── WordProgress ──→ Lexeme
└── Attempt ───────→ Lexeme (+ optional exact occurrence)
```

This allows multiple surface forms to share one learned lexical item after morphology enrichment.

## Course statuses

`CORE`
: actively drilled vocabulary.

`SUPPORT`
: grammatical/high-frequency support words that remain visible in context.

`PROVISIONAL`
: imported but not human-reviewed.

`REVIEWED`
: checked once.

`FINAL`
: approved course content.

## Current learning roadmap

1. page-based vocabulary import
2. lemma/root enrichment
3. Arabic → English recognition
4. English → Arabic recognition
5. matching
6. context questions
7. typing recall
8. spaced repetition
9. weak-word bank
10. phrase translation
11. English Tafsir explanation
12. spoken-answer practice

## Suggested GitHub repository

**Name:** `tafsir-vocab`

**Description:**

> Duolingo-inspired Qur'anic vocabulary trainer for English Tafsir preparation, starting with Juz 14.

**Topics:**

`quran` `tafsir` `arabic` `english` `vocabulary` `spaced-repetition` `nextjs` `prisma` `islamic-app` `mtq`

## Important data-quality rule

Do not treat one word-by-word English translation as the absolute lexical meaning of a Qur'anic word.

Preserve the source gloss, then curate:

- primary English meaning,
- accepted alternatives,
- lemma/root,
- contextual sense,
- Indonesian assistance.

That distinction is especially important for Tafsir training.
