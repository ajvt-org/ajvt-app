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
