# AJVT

Next.js 16, React 19, Prisma 7, Postgres. Arabic interface, right to left.

## Requirements

- Node 26 or newer
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

`npm run dev` regenerates the Prisma client, applies the migrations, creates the admin account, then starts the server on http://localhost:3000.

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

Plain `npm run db:seed` only creates the `admin` account and the age groups. That is the one that runs in production, so keep the fake data out of it. In production it takes the first password from `ADMIN_INITIAL_PASSWORD` and refuses to boot without it, rather than falling back to a value written down here. Once the account exists the seed leaves its password alone, so changing the variable later does nothing.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Generate the Prisma client, migrate, seed the admin, start the dev server |
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

`test:api` needs the container from `npm run db:up`. It creates its own database on it, migrates it, and truncates every table between tests, so it never touches your dev data. The name ends in a short hash of the checkout path, so a git worktree gets its own and two checkouts can run the suite at the same time. Point `TEST_DATABASE_URL` somewhere else if you want another target.

The route handlers are plain exported functions, so the tests import `POST` and call it. Only `next/headers` is faked, to supply the session cookie. Everything else is real: the JWT is signed and verified, and the queries hit Postgres.

## Branches and deploys

`dev` is where work lands. `master` is what production runs. Render serves it from `master`, from a single web service, and there is no other deploy target and no staging environment. Merging into `master` is the release; putting it in production is a separate step, below.

Day to day:

```bash
git checkout dev
git checkout -b feat-something
# ... work, then open a pull request into dev
```

Both branches are protected. Neither takes a direct push, both need the build to pass, and neither can be force pushed or deleted. No review approval is required, since a pull request cannot be approved by the person who opened it.

A release is a pull request too, from `dev` into `master`:

```bash
gh pr create --base master --head dev --title "Release 0.21.0"
# merge once the build passes, then fast-forward dev onto master
```

Merging it runs the release workflow, which tags the merge commit and publishes the tag. Tags live on `master` only, so `git log --tags master` is the release history.

There is no `CHANGELOG.md`, and this is deliberate. Every tag has a [release](https://github.com/ajvt-org/ajvt-app/releases) whose notes are written by hand when the release pull request is opened, and the workflow publishes the pull request body as those notes. A file in the repository would be a second copy of the same thing, kept up to date by whoever remembered. Commits here are plain imperative rather than Conventional Commits, so nothing can generate one either.

Merging the release tags it and publishes the notes. It does not put it in production: the deploy is started by hand from the Render dashboard, and until someone does, production is still running the previous tag. Check which one it is there before assuming a fix is live.

Every boot runs `prisma migrate deploy` and the seed, so a deploy migrates the production database. That is the reason releases are a deliberate merge rather than every merge, the reason the build has to pass before one can happen, and the reason the deploy itself is a decision rather than a consequence.

The service's Health Check Path must be set to `/api/health` in the Render dashboard — this lives outside the repo and nothing in code can set it. Disk-backed services here deploy by stopping the previous instance before starting the new one, since the disk can only be attached to one instance at a time, so there is no previous instance for Render to fall back on during any deploy: the holding page is what every visitor sees for that whole window, not a first-deploy fallback. The setting still matters for a different reason. The port opens the instant boot starts, before migrations even run, so without it Render reads an open port as live and would call the deploy done while the database is still being migrated. The health check path is what makes Render wait for `/api/health` itself to answer healthy first.

To roll back, redeploy the previous commit from the Render dashboard. That is faster than a revert, and it does not undo a migration either way.

Admins are not covered by the rules, so there is a way through if the build is broken and something has to ship. Use it knowingly.

## Dependencies

`npm audit --audit-level=high` runs on every pull request and weekly against the lockfile as it
stands. One dependency is pinned past what its parent asks for; [docs/dependency-overrides.md](docs/dependency-overrides.md)
says which, why, what was tested, and when it can go.

`package-lock.json` is written by npm 11. An older npm drops fields from it and produces churn
unrelated to whatever is being changed.

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

One more is required in production only:

- `ADMIN_INITIAL_PASSWORD` is the password the first `admin` account is created with. The boot fails without it in production, so no deployment ever comes up with a password that is public knowledge. Locally it falls back to `admin123`. It is read once, when there is no admin yet — rotating the real password is done from the admin panel

The rest are optional and the app works without them:

- `NEXT_PUBLIC_BASE_URL` is used for link previews, defaults to the production URL
- `NEXT_PUBLIC_WHATSAPP_LINK` is the group invite shown to members
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` turn on push notifications. Without both, the notifications switch on the profile is hidden and nothing breaks. Generate a pair with `npx web-push generate-vapid-keys`
- `VAPID_SUBJECT` is the contact the push services see, an `https://` or `mailto:` URL. Left empty it uses `NEXT_PUBLIC_BASE_URL` when that is https, and the Render URL otherwise
- `UPLOAD_DIR` is where uploaded images are written, defaults to `public/uploads`

## Uploads

Member photos and payment proofs are written to disk, not to the database. Locally they land in `public/uploads`, which is ignored by git. In production `UPLOAD_DIR` points at a mounted Render disk, so the files survive a redeploy.

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
