# Dependency overrides

`package.json` cannot carry comments, so what is in `overrides` and why is written here.

## `deepmerge-ts` → `^8.0.1`

Added 2026-08-19 for [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx),
three high advisories on one chain: `prisma` → `@prisma/config` → `deepmerge-ts`.

There was no upgrade path. `prisma@7.9.1` is what `package.json` asks for and what npm publishes
as latest, and `@prisma/config` pins `deepmerge-ts` at an exact `7.1.5` while the fixed line is
`8.0.1`. `npm audit fix --force` offered to downgrade Prisma to 6.12.0, which is a breaking change.

The jump crosses a major version across an exact pin, so it was not safe by inspection. What was
run against it, on the override, before it was committed:

- `npx prisma generate`
- `npx prisma migrate deploy` against an empty database, all 74 migrations
- `npx tsx prisma/seed.ts` and `npx tsx prisma/backfillProofHashes.ts`
- `npm test`, `npm run test:ui`, `npm run test:api`, `npm run build`

That is the whole Prisma CLI surface `scripts/start.mjs` runs on every production boot, so a break
there would have been a break in production.

**Remove this when `@prisma/config` ships a dependency on `deepmerge-ts` 8** (#432). Check with
`npm view @prisma/config dependencies`. Once it does, delete the override, run `npm install` with
npm 11, and confirm `npm ls deepmerge-ts` no longer says `overridden`.

## `mysql2` → `^3.24.2`

Added 2026-09-01 for [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), a high
advisory on mysql2 below 3.22.0 where an auth plugin downgrade to `mysql_clear_password` leaks the
password in the clear. The audit job started failing on every branch. The range also covers
[GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), a later moderate on 3.23.0
and below.

`mysql2` is a plain dependency of the `prisma` CLI, not an optional one, so it is in the tree on
every install. Prisma pins one exact version of it and the latest release still pins 3.15.3, so
there is no Prisma release to move to. `npm audit fix --force` offered a downgrade to Prisma 6,
which is two majors back.

Nothing here talks to MySQL. The datasource is Postgres and the client goes through the pg adapter,
so the package is carried and never loaded. That does not make the audit wrong to stop the build,
and an override costs nothing.

**Remove this when `prisma` depends on mysql2 3.23.1 or later.** Check with
`npm view prisma dependencies`. Once it does, delete the override and confirm `npm ls mysql2` no
longer says `overridden`.
