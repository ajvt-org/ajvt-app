# Contributing

Setup, the scripts, the test suites and the environment variables are in the
[README](README.md). Read [Branches and deploys](README.md#branches-and-deploys)
before opening a pull request — `dev` and `master` are protected, work lands on
`dev`, and a release is a pull request from `dev` into `master`.

Three things that catch people out:

- This is Next.js 16. Its APIs, conventions and file layout differ from what
  most references and most models will tell you, so a plausible-looking answer
  is often a version or two out of date. The guides bundled in
  `node_modules/next/dist/docs/` are the authority — read the relevant one
  before writing routing or caching code, and heed the deprecation notices.
- Prettier owns formatting and CI checks it. See
  [Formatting](README.md#formatting), which also has the one-off `git blame`
  setting worth running.
- A schema change needs a migration in `prisma/migrations/`, written by hand.
  Every boot runs `prisma migrate deploy`, so a release migrates the production
  database. Create the folder with `npm run db:new-migration -- <name>` rather
  than naming it yourself: migrations replay in folder-name order on a rebuild,
  so a new one has to sort after every existing one, and
  `src/lib/migrationOrder.test.ts` fails the build if it does not or if it is
  dated more than a day past the last migration. Folders have been hand-dated
  ahead of the clock before, and when they have, today's date sorts too early —
  the script takes the later of the clock and one second past the last folder.

A failed request on an admin screen is reported in place, not as a toast. Hold
the message in state, clear it when the next attempt starts, and render it with
`ErrorNotice` at the top of the panel that failed. Toasts stay for the short
confirmation that something worked. An admin who has scrolled away misses a
toast, and the panel that just failed is the thing being looked at. Most of the
admin screens already do this and the rest move over as they are touched, so
follow it in any file you are already changing rather than sweeping the whole
tree.

Before pushing:

```bash
npm run lint && npm run typecheck && npm run format:check
npm test && npm run test:ui && npm run test:api
npm run build && E2E_PRODUCTION=1 npm run test:e2e
```

`E2E_PRODUCTION=1` is not optional advice. Without it the end to end run starts the
dev server, and its file watcher runs out of inotify capacity on any machine holding
a few git worktrees. See [Tests](README.md#tests).

Commit subjects are plain imperative and short — "Keep the fee on the member and
the surplus in donations", not "fix: membership fee". No `feat:` or `fix:`
prefixes, no long bodies.

Security problems do not go in an issue. See [SECURITY.md](SECURITY.md).
