# Juz 14 data pipeline

The course deliberately separates a **word occurrence** from a **lexeme**.

## Why?

The Qur'an can contain surface forms such as:

- `قَالَ`
- `وَقَالَ`
- `قَالُوا`
- `يَقُولُونَ`

A page-oriented reader must preserve each occurrence in its exact ayah position, while a vocabulary trainer should eventually connect related forms to their canonical lemma/root.

## Pipeline

### 1. Seed 20 units

```bash
npm run db:migrate
npm run db:seed
```

This creates:

- Unit 1 → Mushaf page 262
- ...
- Unit 20 → Mushaf page 281

It does **not** guess surah/ayah ranges.

### 2. Import Juz 14

Add Quran Foundation Content API credentials to `.env`, then:

```bash
npm run data:import:juz14
```

For each of pages 262–281 the script:

1. requests English word-level data;
2. requests Indonesian word-level data;
3. matches words by Qur'anic word location;
4. stores exact occurrences;
5. creates provisional lexical records;
6. classifies content-heavy words as `CORE` and very common grammatical/support words as `SUPPORT`;
7. derives the actual surah label and ayah range from returned verses.

At this stage the application is already usable for recognition/context drills.

### 3. Enrich morphology

Place a Quranic Arabic Corpus morphology file locally, for example:

```text
data/import/quranic-corpus-morphology-0.4.txt
```

The source file itself is intentionally not committed.

Run:

```bash
npm run data:enrich:morphology -- data/import/quranic-corpus-morphology-0.4.txt
```

The script reads word locations such as:

```text
(15:1:3:1)
```

and extracts available:

- lemma,
- root,
- part of speech.

Buckwalter transliteration is converted to Arabic. Occurrences are then reassigned from provisional `surface:*` lexical records to canonical `lemma:*` lexical records.

### 4. Human curation

Automated glosses are **source glosses**, not final Tafsir definitions.

Before a lexical record becomes competition-grade content:

- review the lemma;
- review the root;
- choose a concise primary English meaning;
- add valid English alternatives;
- add/verify Indonesian help;
- decide `CORE` vs `SUPPORT`;
- set `reviewStatus` to `REVIEWED`, then `FINAL`.

## Status meanings

### `courseStatus`

- `CORE` — actively drilled
- `SUPPORT` — retained in context, but lower priority

### `reviewStatus`

- `PROVISIONAL` — machine-imported / not fully checked
- `REVIEWED` — checked once
- `FINAL` — approved course content

## Principle for English Tafsir

Do not confuse:

1. **source word-by-word gloss**
2. **lexical core meaning**
3. **contextual meaning in a verse**
4. **Tafsir explanation**

The app should eventually train all four levels.
