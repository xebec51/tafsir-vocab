# Juz 14 course data

This directory contains **course-owned curation**, not copied Qur'an API dumps.

The canonical Qur'an text and word occurrences are imported into the database at setup time.
Human-reviewed English meanings and alternatives should be maintained here or in a future admin curation UI.

Recommended workflow:

1. import;
2. morphology enrichment;
3. `npm run data:stats`;
4. review `PROVISIONAL` lexemes page by page;
5. mark reviewed entries `REVIEWED` / `FINAL`.
