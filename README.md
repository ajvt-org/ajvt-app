# AJVT

Next.js 16, React 19, Prisma 7, Postgres. Arabic interface, right to left.

## Requirements

- Node 20.9 or newer
- Docker, for the local database
- No local Postgres install needed, it runs in a container

## Setup

```bash
git clone https://github.com/ajvt-org/ajvt-app.git
cd ajvt-app
npm install
cp .env.example .env
npm run db:up
npm run dev
```

`npm run dev` applies the migrations, creates the admin account, then starts the server on http://localhost:3000.

The database starts empty apart from the admin account. To get something to look at, load the fake data:

```bash
npm run db:seed:dev
```

That gives you 34 members across all three statuses, 8 teams with played matches, donations, expenses, a month of visit stats and a few quiz questions. It wipes the tables first, so run it whenever you want a clean state.

## Accounts

After `npm run db:seed:dev`:

| Who | Login | Password |
| --- | --- | --- |
| Full admin | `admin` | `admin123` |
| Members admin | `members` | `admin123` |
| Activities admin | `activities` | `admin123` |
| Members | phones from `21000000` upward | `user123` |

Admins sign in at `/admin/login`, members at `/login`. The exact member phone numbers are printed when the seed finishes.

Plain `npm run db:seed` only creates the `admin` account and the age groups. That is the one that runs in production, so keep the fake data out of it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Migrate, seed the admin, start the dev server |
| `npm run build` | Generate the Prisma client and build |
| `npm run db:up` | Start the local Postgres container |
| `npm run db:down` | Stop it |
| `npm run db:seed:dev` | Wipe and reload the fake data |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run lint` | ESLint |

## Tests

```bash
npm test          # unit tests, no database
npm run test:ui   # components, in jsdom
npm run test:api  # route handlers against a real database
```

`test:api` needs the container from `npm run db:up`. It creates a separate `ajvt_test` database on it, migrates it, and truncates every table between tests, so it never touches your dev data. Point `TEST_DATABASE_URL` somewhere else if you want another target.

The route handlers are plain exported functions, so the tests import `POST` and call it. Only `next/headers` is faked, to supply the session cookie. Everything else is real: the JWT is signed and verified, and the queries hit Postgres.

## Formatting

Prettier owns formatting, CI checks it. Run `npm run format` before pushing, or set your editor to format on save.

The whole codebase was reformatted in one commit. Run this once so `git blame` skips it:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Environment

Copy `.env.example` to `.env`. Two variables are required:

- `DATABASE_URL` points at the container from `docker-compose.dev.yml`, on port 5433 so it does not clash with a Postgres you may already run
- `JWT_SECRET` signs the session cookies. The app throws on startup without it. Use any string locally, a real random value in production

The rest are optional and the app works without them:

- `NEXT_PUBLIC_BASE_URL` is used for link previews, defaults to the production URL
- `NEXT_PUBLIC_WHATSAPP_LINK` is the group invite shown to members
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` turn on push notifications. Without both, push is skipped and nothing breaks
- `UPLOAD_DIR` is where uploaded images are written, defaults to `public/uploads`

## Uploads

Member photos and payment proofs are written to disk, not to the database. Locally they land in `public/uploads`, which is ignored by git. In production `UPLOAD_DIR` points at a mounted disk, so the files survive a redeploy.

## Database

The container keeps its data in a named Docker volume, so stopping it does not lose anything. To start over:

```bash
npm run db:down
docker volume rm ajvt-app_ajvt-dev-db
npm run db:up
npm run dev
```

`prisma/seed-dev.ts` refuses to run unless `DATABASE_URL` points at localhost, so it cannot touch a remote database by accident.

After changing `prisma/schema.prisma`, create a migration with `npx prisma migrate dev --name what_changed`.
