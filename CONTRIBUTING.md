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
  database. Name the folder with the real current UTC time — migrations replay
  in folder-name order on a rebuild, and `src/lib/migrationOrder.test.ts` fails
  the build if a new folder sorts before an existing one or is dated more than
  a day past the last migration.

Before pushing:

```bash
npm run lint && npm run typecheck && npm run format:check
npm test && npm run test:ui && npm run test:api
```

Commit subjects are plain imperative and short — "Keep the fee on the member and
the surplus in donations", not "fix: membership fee". No `feat:` or `fix:`
prefixes, no long bodies.

Security problems do not go in an issue. See [SECURITY.md](SECURITY.md).
