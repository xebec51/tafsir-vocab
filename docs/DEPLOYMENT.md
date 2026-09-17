# Deployment checklist

## Database

1. Provision PostgreSQL.
2. Add `DATABASE_URL`.
3. Run `npm run db:migrate`.
4. Run `npm run db:seed`.

## Quran Foundation

1. Create a server/backend developer application.
2. Store `QF_CLIENT_ID` and `QF_CLIENT_SECRET` only in server environment variables.
3. Set `QF_ENV=prelive` while using pre-live credentials.
4. Run `npm run data:import:juz14` against the deployment database.

## Verification

Open `/setup` and verify:

- PostgreSQL connected
- 20/20 Juz 14 pages seeded
- word occurrence count is greater than zero
- Quran Foundation credentials configured

Then test:

- Unit 1 lesson flow
- an incorrect answer appears in Weak Words
- XP changes after a question
- review scheduling is stored
- page unlock happens after the final lesson is passed
- another browser receives an independent anonymous learner profile

## Secrets

Never commit:

- `.env`
- database credentials
- Quran Foundation client secret
- raw private data exports
