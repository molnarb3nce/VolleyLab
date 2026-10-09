# VolleyLab database setup

PostgreSQL + Prisma. The schema is in `backend/prisma/schema.prisma`; migrations are in `backend/prisma/migrations`.
The reasoning behind the model is in `project-context.md` (sections 4-8).

## Local development

```bash
docker compose up -d          # PostgreSQL (5432) and pgAdmin (5050)
cd backend
cp .env.example .env          # DATABASE_URL points at the local container
npm install                   # also runs `prisma generate`
npx prisma migrate dev        # apply migrations, create new ones after schema changes
npm test
```

pgAdmin runs at <http://localhost:5050> (login `admin@volleylab.dev` / `admin`).
Register the local server with: host `db` (the compose service name), port `5432`,
database `volleylab`, user `volleylab`, password `volleylab`.

## Tests

- `npm test` runs the unit tests (no database needed).
- `npm run test:e2e` runs the API tests with Supertest. They use `backend/.env.test`, which points at the
  `test` schema of the same local database, so your development data in the `public` schema is never
  touched. The run applies the migrations to that schema and empties its tables before every test.
  The runner refuses to start if `DATABASE_URL` does not contain `schema=test`.

## Changing the schema

Edit `schema.prisma`, then run `npx prisma migrate dev --name <change>`.

CHECK constraints cannot be written in `schema.prisma`; add them as raw SQL to the generated
`migration.sql` (use `--create-only`, edit, then apply). The initial migration already contains
the CHECK constraints for jersey numbers, scores, court coordinates, and valid action/result pairs.

After a schema change run `npx prisma generate` (done automatically by `migrate dev`). Your editor
may need "Developer: Reload Window" before it sees the new generated types.

## Deployment

Production hosting is documented in [deployment-railway.md](./deployment-railway.md) (PostgreSQL on
Railway, API and web as separate services, migrations on API startup).
 