# Where the API routes stand

Every file under `src/app/api` that exports a handler, and what it does about wrapping,
validation and errors. Read off the files on 2026-08-19, not estimated.

The target is the convention `src/app/api/admin/expenses/` already follows: a colocated
`schema.ts` whose zod messages are Arabic strings from `@/lib/messages`, consumed through
`parse(schema, await req.json())`, with failures thrown as typed errors and turned into a
response by `withRoute`.

## What the numbers actually are

| | count |
| --- | --- |
| route files | 112 |
| exported handlers | 151 |
| handlers not wrapped in `withRoute` | 10 |
| files with a colocated `schema.ts` | 26 |
| files importing `@/lib/validation` | 28 |
| files that still return a raw `NextResponse.json({ error })` | 46 |
| files that throw typed errors and never return a raw body | 26 |

Three corrections to the figures this work started from:

- **112 route files, not 95**, and 151 handlers rather than one per file.
- **10 unwrapped handlers, not 9 files' worth of hand-rolled everything.** All ten are in the
  list below, and none of them is a validation problem — they are logout, file serving, upload
  and verify, written as `export async function` rather than `export const = withRoute(...)`.
- **`admin/teams/[teamId]/route.ts` is already wrapped.** It was cited as an example of a route
  that hand-rolls its checks; it does hand-roll validation (`name.trim().length > 40`) but it goes
  through `withRoute`. Being unwrapped and lacking a schema are two different debts and the
  counts above keep them apart.

## The ten unwrapped handlers

| route | handler | why it is like that |
| --- | --- | --- |
| `admin/logout/route.ts` | POST | four lines, deletes a cookie, no body and no failure |
| `auth/logout/route.ts` | POST | same |
| `files/[filename]/route.ts` | GET | streams a file; the DB-row lookup guarding it is deliberate |
| `files/activity/[filename]/route.ts` | GET | same |
| `files/donation/[filename]/route.ts` | GET | same |
| `files/member/[filename]/route.ts` | GET | same |
| `files/team/[filename]/route.ts` | GET | same |
| `teams/[teamId]/follow/route.ts` | GET | reads a follow state |
| `upload/route.ts` | POST | multipart, not JSON; also exports `getUploadDir` |
| `verify/[memberNumber]/route.ts` | GET | public card check |

The five `files/*` routes return image bytes rather than JSON, so wrapping them changes what a
failure looks like to an `<img>` tag. They are the last ones to touch, not the first.

## Risky to migrate

**A client component compares one error body character by character.**
`src/app/form/page.tsx:859` tests `error === "رقم الهاتف مسجّل مسبقاً"` to decide whether to offer
a sign-in link, and `src/app/api/auth/register/route.ts:35` is what produces that string. Moving
that message into `@/lib/messages` is fine; changing its wording silently removes the link.

**Twenty routes have an exact error body pinned by a test.** Any migration that changes the
sentence, not just where it is thrown from, breaks one of these:

- `admin/activities/[id]/bracket/draw/route.ts`
- `admin/activities/[id]/bracket/next-round/route.ts`
- `admin/activities/[id]/bracket/semis-from-groups/route.ts`
- `admin/activities/[id]/detail/route.ts`
- `admin/activities/[id]/groups/route.ts`
- `admin/activities/[id]/matches/generate/route.ts`
- `admin/activities/[id]/matches/route.ts`
- `admin/activities/[id]/register/route.ts`
- `admin/activities/[id]/route.ts`
- `admin/activities/[id]/teams/route.ts`
- `admin/activities/route.ts`
- `admin/expenses/[id]/route.ts` — `المصروف غير موجود` in `tests/api/admin-expenses.test.ts`
- `admin/login/route.ts` — `اسم المستخدم أو كلمة المرور غير صحيحة` in `tests/e2e/guards.spec.ts`
- `admin/quiz/questions/[id]/route.ts`
- `admin/quiz/questions/route.ts`
- `admin/teams/[teamId]/members/[memberId]/route.ts`
- `admin/teams/[teamId]/members/route.ts`
- `admin/teams/[teamId]/route.ts`
- `donations/route.ts`
- `user/me/route.ts`

`tests/api/error-contract.test.ts` covers the shape every failure has to keep. It must pass
untouched through all of this.

## Order worth taking them in

1. Files that already import `@/lib/validation` but still return a raw body — the smallest step,
   since the schema exists and only the throw has to change.
2. Files with a colocated `schema.ts` that no route imports.
3. Files with neither, one feature area at a time, so the messages that move into
   `@/lib/messages` land as a group rather than scattered.
4. The two logout routes and `teams/[teamId]/follow`, which are trivial.
5. `upload/` and the five `files/*` routes last: they do not answer with JSON, so wrapping them
   is a change to what a failure looks like, not a refactor.

## The table

| route | handlers | withRoute | zod schema | errors |
| --- | --- | --- | --- | --- |
| `activities/register/route.ts` | DELETE, POST | yes | yes | raw (7) |
| `activities/route.ts` | GET | yes | no | none |
| `admin/activities/[id]/bracket/draw/route.ts` | POST | yes | no | raw (4) |
| `admin/activities/[id]/bracket/next-round/route.ts` | POST | yes | no | raw (5) |
| `admin/activities/[id]/bracket/semis-from-groups/route.ts` | POST | yes | no | raw (4) |
| `admin/activities/[id]/detail/route.ts` | GET | yes | no | raw (1) |
| `admin/activities/[id]/finance/route.ts` | GET | yes | no | typed (1) |
| `admin/activities/[id]/groups/route.ts` | GET, POST | yes | no | raw (5) |
| `admin/activities/[id]/matches/generate/route.ts` | POST | yes | no | raw (2) |
| `admin/activities/[id]/matches/route.ts` | GET, POST | yes | no | raw (6) |
| `admin/activities/[id]/register/route.ts` | DELETE, PATCH, POST | yes | yes | raw (4) |
| `admin/activities/[id]/roster/route.ts` | GET | yes | no | none |
| `admin/activities/[id]/route.ts` | DELETE, PATCH | yes | yes | raw (6) |
| `admin/activities/[id]/teams/route.ts` | GET, POST | yes | no | raw (4) |
| `admin/activities/route.ts` | GET, POST | yes | yes | mixed (1 typed, 2 raw) |
| `admin/admins/[id]/activities/route.ts` | PUT | yes | no | typed (5) |
| `admin/admins/[id]/route.ts` | DELETE | yes | no | raw (3) |
| `admin/admins/route.ts` | GET, POST | yes | no | raw (4) |
| `admin/age-groups/[id]/route.ts` | DELETE, PATCH | yes | no | raw (5) |
| `admin/age-groups/[id]/total/route.ts` | PATCH | yes | no | typed (2) |
| `admin/age-groups/reassign/route.ts` | POST | yes | no | raw (4) |
| `admin/age-groups/route.ts` | GET, POST | yes | no | raw (3) |
| `admin/audit-log/route.ts` | GET | yes | no | none |
| `admin/bookings/[bookingId]/route.ts` | DELETE | yes | no | none |
| `admin/change-password/route.ts` | POST | yes | no | raw (4) |
| `admin/deleted/[id]/restore/route.ts` | POST | yes | no | typed (3) |
| `admin/deleted/route.ts` | GET | yes | no | none |
| `admin/donations/[id]/route.ts` | DELETE, PATCH | yes | yes | raw (10) |
| `admin/donations/route.ts` | POST | yes | yes | none |
| `admin/expenses/[id]/route.ts` | DELETE, PATCH | yes | parse only | raw (2) |
| `admin/expenses/route.ts` | GET, POST | yes | yes | none |
| `admin/export/[dataset]/route.ts` | GET | yes | no | typed (1) |
| `admin/finance-tags/[id]/route.ts` | DELETE, PATCH | yes | no | raw (5) |
| `admin/finance-tags/route.ts` | GET, POST | yes | no | raw (3) |
| `admin/finance/summary/route.ts` | GET | yes | no | none |
| `admin/groups/[groupId]/route.ts` | DELETE, PATCH | yes | no | raw (4) |
| `admin/login/route.ts` | POST | yes | no | raw (4) |
| `admin/logout/route.ts` | POST | **no** | no | none |
| `admin/matches/[matchId]/bookings/route.ts` | POST | yes | yes | raw (3) |
| `admin/matches/[matchId]/mvp-vote/route.ts` | DELETE, PATCH, POST | yes | yes | raw (5) |
| `admin/matches/[matchId]/route.ts` | DELETE, PATCH | yes | yes | raw (16) |
| `admin/me/route.ts` | GET | yes | no | none |
| `admin/members/[id]/account/route.ts` | PATCH | yes | yes | typed (4) |
| `admin/members/[id]/memberships/route.ts` | GET | yes | no | typed (1) |
| `admin/members/[id]/payment/route.ts` | PUT | yes | yes | typed (2) |
| `admin/members/[id]/profile/route.ts` | GET | yes | no | raw (1) |
| `admin/members/[id]/renew/route.ts` | POST | yes | yes | typed (3) |
| `admin/members/[id]/route.ts` | DELETE, PATCH | yes | yes | mixed (1 typed, 2 raw) |
| `admin/members/[id]/same-person/route.ts` | GET | yes | no | none |
| `admin/members/route.ts` | GET, POST | yes | yes | mixed (1 typed, 1 raw) |
| `admin/notifications/broadcast/route.ts` | POST | yes | yes | none |
| `admin/notifications/summary/route.ts` | GET | yes | no | none |
| `admin/payment-proofs/route.ts` | GET | yes | no | none |
| `admin/proof-reuse/route.ts` | GET | yes | no | none |
| `admin/quiz/attempts/[id]/route.ts` | GET | yes | no | none |
| `admin/quiz/banks/[id]/route.ts` | DELETE, PATCH | yes | no | typed (1) |
| `admin/quiz/banks/route.ts` | GET, POST | yes | no | typed (1) |
| `admin/quiz/competitions/[id]/attempts/route.ts` | GET | yes | no | typed (1) |
| `admin/quiz/competitions/[id]/participants/route.ts` | GET, PUT | yes | no | typed (2) |
| `admin/quiz/competitions/[id]/reset/route.ts` | POST | yes | no | none |
| `admin/quiz/competitions/[id]/rounds/fill/route.ts` | POST | yes | no | none |
| `admin/quiz/competitions/[id]/rounds/route.ts` | GET, PUT | yes | no | typed (2) |
| `admin/quiz/competitions/[id]/route.ts` | DELETE, GET, PUT | yes | no | typed (1) |
| `admin/quiz/competitions/[id]/standings/route.ts` | GET | yes | no | none |
| `admin/quiz/competitions/[id]/start/route.ts` | POST | yes | no | none |
| `admin/quiz/competitions/[id]/winners/route.ts` | GET | yes | no | none |
| `admin/quiz/competitions/route.ts` | GET, POST | yes | no | typed (1) |
| `admin/quiz/questions/[id]/route.ts` | DELETE, PATCH | yes | no | raw (10) |
| `admin/quiz/questions/import/route.ts` | POST | yes | no | typed (1) |
| `admin/quiz/questions/route.ts` | GET, POST | yes | no | raw (7) |
| `admin/quiz/send/route.ts` | POST | yes | no | raw (1) |
| `admin/quiz/settings/route.ts` | GET, PATCH | yes | no | raw (3) |
| `admin/reset-password/route.ts` | POST | yes | yes | raw (1) |
| `admin/settings/route.ts` | GET, PATCH | yes | yes | none |
| `admin/site-stats/route.ts` | GET | yes | no | none |
| `admin/teams/[teamId]/members/[memberId]/route.ts` | DELETE, PATCH | yes | no | raw (2) |
| `admin/teams/[teamId]/members/route.ts` | POST | yes | parse only | raw (6) |
| `admin/teams/[teamId]/route.ts` | DELETE, PATCH | yes | no | raw (6) |
| `admin/validate/route.ts` | POST | yes | no | typed (3) |
| `ages/route.ts` | GET | yes | no | none |
| `ages/standings/route.ts` | GET | yes | no | none |
| `auth/login/route.ts` | POST | yes | no | typed (5) |
| `auth/logout/route.ts` | POST | **no** | no | none |
| `auth/register/route.ts` | POST | yes | no | raw (5) |
| `donations/route.ts` | POST | yes | no | mixed (1 typed, 10 raw) |
| `files/[filename]/route.ts` | GET | **no** | no | none |
| `files/activity/[filename]/route.ts` | GET | **no** | no | none |
| `files/donation/[filename]/route.ts` | GET | **no** | no | none |
| `files/member/[filename]/route.ts` | GET | **no** | no | none |
| `files/team/[filename]/route.ts` | GET | **no** | no | none |
| `leaderboard/route.ts` | GET | yes | no | none |
| `matches/[matchId]/mvp-vote/route.ts` | POST | yes | yes | raw (4) |
| `members/[id]/route.ts` | GET, PATCH | yes | yes | raw (2) |
| `members/route.ts` | POST | yes | yes | typed (5) |
| `push/subscribe/route.ts` | POST | yes | yes | none |
| `push/unsubscribe/route.ts` | POST | yes | yes | none |
| `quiz/attempt/answer/route.ts` | POST | yes | yes | typed (1) |
| `quiz/attempt/route.ts` | POST | yes | no | typed (3) |
| `quiz/breakdown/route.ts` | GET | yes | no | typed (3) |
| `quiz/competitions/route.ts` | GET | yes | no | typed (1) |
| `quiz/standings/route.ts` | GET | yes | no | none |
| `settings/route.ts` | GET | yes | no | none |
| `teams/[teamId]/follow/route.ts` | DELETE, GET, POST | **no** | no | raw (1) |
| `teams/[teamId]/join/route.ts` | DELETE, POST | yes | yes | raw (7) |
| `track-visit/route.ts` | POST | yes | no | none |
| `upload/route.ts` | POST | **no** | no | raw (6) |
| `user/activities/route.ts` | GET | yes | no | none |
| `user/matches/route.ts` | GET | yes | no | none |
| `user/me/route.ts` | GET | yes | no | raw (1) |
| `user/password/route.ts` | POST | yes | yes | typed (5) |
| `verify/[memberNumber]/route.ts` | GET | **no** | no | none |
