# Working on this repository

For coding agents, and for anyone arriving without the history. This is a map of
where the rules live, plus the traps that a plausible-looking answer walks into.
[README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md) are the authority
and this file does not restate them.

Next.js 16, React 19, Prisma 7, Postgres. The interface is Arabic and right to
left. `dev` is where work lands, `master` is what production runs.

## Read before writing code

- [README.md](README.md) for setup, the scripts, the four test tiers, the
  environment variables, and [Branches and
  deploys](README.md#branches-and-deploys).
- [CONTRIBUTING.md](CONTRIBUTING.md) for the three things that catch people out.
- `node_modules/next/dist/docs/` for anything about routing, caching or
  rendering. Most published material and most model training describes an
  earlier Next.js, so an answer that looks right is often a version or two out
  of date. The block at the end of this file says the same thing and Next.js
  maintains it.

## Traps

**A passing typecheck proves nothing about a schema change.** Prisma's create
input is a union, so a query naming a column that has moved still compiles and
still builds. It fails when it runs. The `test:api` and `test:e2e` tiers are what
catch it.

**Migrations are written by hand.** Create the folder with `npm run
db:new-migration -- <lower_snake_case_name>` rather than naming it yourself, and
read the SQL before committing it. Two branches open at once produce the same
stamp, so check `ls prisma/migrations | tail` after a rebase and renumber if
yours no longer sorts last. Every boot runs `prisma migrate deploy`, so a release
migrates the production database.

**Each worktree needs its own `npm ci`.** Do not symlink `node_modules` back to
another checkout. They would share one generated Prisma client, and `test:api`
then runs against whichever schema the other checkout generated last and fails
with columns that do not exist.

**A fresh worktree has no `.env`.** Copy one in or the build fails on a missing
`DATABASE_URL`.

**Do not run `test:e2e` without `E2E_PRODUCTION=1`.** Build first, then run it.
Without it Playwright starts the dev server, whose file watcher exhausts the
inotify limit on any machine holding a few worktrees, and the failure names the
watcher rather than anything you changed.

## House rules

- **No user-facing text in the code.** Labels, placeholders and headings go in
  `src/lib/texts/`, one file per feature, `as const`, re-exported from
  `index.ts`. API, validation and error strings go in `src/lib/messages/`. This
  covers Arabic sitting directly in JSX. Clean a file as you touch it and add its
  path to `KEPT_CLEAN` in `src/lib/inlineTexts.test.ts`.
- **Icons, never emoji.** `Icon` and `IconLabel` draw from SVG and inherit
  `currentColor`. ESLint enforces this and names the few exceptions.
- **No comments.** The reasoning belongs in the pull request, where it is read
  once and stays true. Trim the ones you find in a file you are already changing.
- **Small files and small functions.** Domain logic goes in `src/lib/` as pure
  functions that test without Prisma. Touching a large file means splitting it as
  part of the work.
- **Reuse the styling that is there.** The `--mint-*` and `--text-*` variables
  and the `card`, `badge` and `input` utility classes. No new styling approach.
  Check a screen at 360px, no tier covers how it looks.

## The domain, in three facts

- **The account is the person.** `User` carries the identity, including
  `fullName`, `memberNumber` and `verifyToken`. There is no `Member` table.
  Key new code on `userId`.
- **`Payment` is the record for money.** `Membership` and `Donation` mirror into
  it through `src/lib/paymentMirror.ts`. Do not add a second place that stores an
  amount, and anything added to either table has to be carried through the mirror
  or half the rows arrive empty.
- **Admin screens are read by colleagues with no training.** Short invariant
  Arabic labels, every edit visible and labelled.

## Committing

Branch off `dev`, name the branch `type-subject` with hyphens, and open the pull
request against `dev`. Commit subjects are plain imperative English, short, with
no `feat:` or `fix:` prefix and no trailers. Fill
[.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) and tick the
migration box only when the branch carries one. CI runs every tier on every push,
so push and read the result rather than running the whole suite locally.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
