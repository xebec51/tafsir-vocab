# Sentence Translation

## Architecture

Routes under `/sentences` share TafsirVocab's header, Arabic font, authenticated or
anonymous learner identity, feedback styles, mastery thresholds, and SRS scheduler.
`SentenceProgress` and sentence attempts are separate from `WordProgress` and Word
Quiz attempts. Sentence answers add XP and daily streak activity to the existing
learner. Word Quiz behavior is unchanged.

`SentenceSegment` belongs to a Mushaf `Page` and an existing `Verse`. Membership in
`SentenceSegmentWord` links exact source word occurrences. Initial Juz 14 content
uses complete ayat; it does not claim automatically inferred clause boundaries.
Shared material is maintained by a trusted curator using the import commands,
not by unrestricted browser writes. Personal progress is scoped by the learner
resolved from the session cookie, never by a learner ID from the request body.

## Material and migration

Use the dedicated **tafsir_vocab** database on Neon project
`round-truth-47331902`. Keep `.env.local` private and preserve its existing values.

```sh
npm run db:migrate
npm run data:import:sentences
npm run data:verify:sentence-audio
```

Import requires the previously imported Juz 14 `WordOccurrence` data. It checks
stored Arabic against Quran Foundation, fetches full-ayah English resource 20
and an available Indonesian resource, and records resource names and source
links. HTML is parsed as text; footnote markers are omitted while bracketed
translation clarifications are preserved. Existing segments and personal tafsir
translations are never overwritten. Unavailable translations stay `PENDING`.
Repeating import is safe. Every page is written in one transaction.

Audio verification requests the same whole ayah from Quran Foundation, checks its
Arabic text and verse-indexed filename, and confirms the actual audio response.
Only verified complete-ayah clips are enabled. Partial segments need a manually
audited exact clip; they never borrow the whole ayah's audio automatically.

## Manual semantic curation

```sh
npm run data:curate:sentences -- path/to/curation.json
```

The JSON file contains an array of entries with:

- `page` (262–281), `surah`, `ayah`, `segmentOrder`, `verseOrder`.
- `arabicText`: exact unmodified substring of the stored ayah.
- `startWordPosition` and `endWordPosition` for partial-ayah groups.
- `englishTranslation`, optional `indonesianTranslation`.
- `translationSource`, `sourceUrl` (HTTPS), `contextNote`, `explanation`.
- `acceptedAnswers`: manually approved equivalent English answers.
- `curationStatus`: `PENDING`, `READY`, or `ARCHIVED`.
- Optional `audioUrl` (HTTPS) and `audioVerified` after curator alignment review.
- Optional existing `id` to edit metadata or archive a segment.

Create narrower groups as pending, check meaning and word boundaries manually,
then publish them and archive the superseded whole-ayah group in the same JSON
batch. Assign unused ordering numbers, such as increments of ten. Curation does
not delete historical attempts. Practiced Arabic/translation content is immutable:
archive it and create a replacement instead of rewriting the history.

Ready groups require a translation and traceable source. The command validates
membership and Arabic against the database, then applies the entire batch in one
transaction. No AI translation or automatic semantic segmentation is used.

## Sessions and scoring

- Session creation uses a unique request ID and saves the server's full question
  snapshot. Four distinct options come from sourced material in the
  same surah, ranked by nearby ayah and comparable length.
- Matching presents at most three segments at a time. Missing Phrase extracts
  an exact phrase from the sourced translation.
- Typing compares normalized punctuation/case and approved alternative answers.
  It is explicitly a study aid, not an automated semantic verdict. A valid
  unlisted translation can be compared with the reference and later curated.
- Answer correctness, counters, XP, streak and the SRS update are committed in
  one transaction. Row locks serialize concurrent writes. An attempt ID cannot
  be reused for a different answer or session.
- Wrong answers return to the queue. Finalization requires a correct answer for
  every planned segment. Results are stored and replayed without new rewards.
- Immediate repeats do not increase SRS intervals. The first error in a session
  repairs the schedule; an immediate correct retry cannot extend that interval.
- Refresh reconstructs the outstanding queue and score from stored attempts.
  Interrupted saves retry the same attempt payload. Anonymous history is retained
  at signup and merged into an existing account on login.
- Page completion and mastery are distinct. Completion means each published group
  has been recalled; mastery follows the existing longitudinal SRS thresholds.

## Verification

```sh
npm run typecheck
npm run lint
npm run test:core
npm run test:sentences
npm run build
```

Integration tests must use a local PostgreSQL test database or an explicitly
selected isolated Neon branch. The test runner refuses a cloud database unless
`SENTENCE_TEST_DATABASE=1` is set. Tests create uniquely named fixture rows from
four sourced ayat and remove only their own records afterward. CI runs the suite
against its PostgreSQL service and applies the normal Prisma migration history.

For browser tests, run a development server on port 3100 against the same isolated
database and use `npm run test:e2e`. Windows uses installed Edge; other platforms
use Playwright Chromium. Tests cover all seven modes, source context, matching,
responsive layouts, saved progress after refresh and login, user isolation, and a
connection failure after a successful server commit.

`scripts/sentence-db-task.mjs` accepts a task and optional verified Neon branch
hostname. It inherits credentials in memory and only changes the host for the
child process. It never writes environment files or logs connection passwords.
