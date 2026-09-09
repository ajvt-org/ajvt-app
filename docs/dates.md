# Dates

Nothing in the repository said which date shape was right, so every screen answered it again
and one idea ended up written six ways. #1753 settled it. This page is the settlement, so
that the next person to draw a date reads it here instead of deciding it once more.

## The rule

**Date then time, always, in that order.** A time on its own is allowed where the day is
already established by the heading above it. A time before a date is not.

**`YYYY/MM/DD HH:MM`.** Slashes, zero padded, twenty four hour, Latin digits. It sorts, it
never reads as another date, and it is what the shared formatter already produces.

**One timezone, the club's.** `Africa/Nouakchott`, through `src/lib/clubTime.ts`. Never the
reader's device, and never UTC. Mauritania keeps one offset all year, so UTC and the club
agree today, but reading UTC says nothing about which of the two the code meant.

**Every date is isolated.** A `<bdi dir="ltr">` around the whole of it, never a bare
interpolation into an Arabic sentence, and never an invisible mark doing the job. This was
settled for numbers in #1319, and a date is a longer run of the same problem. A sentence that
carries a date does not build it by joining strings. The words live in `src/lib/texts` and
the component places the date beside them, so the wrapper can go around the date alone.

**A read only date is text.** Never a disabled form control. The browser draws that one in
its own locale, on a twelve hour clock, and the app cannot reach inside it.

**A long Arabic date is a heading, not a field.** It stands above a day's rows and it never
substitutes for a dated record.

## Where the family lives

`src/lib/clubTime.ts`, and nowhere else. A date formatter that lives next to the screen using
it is a copy waiting to happen, and a private table of the Arabic month names is a formatter
in disguise. If a screen needs a shape the family does not have, add it to the family.

These are the exports and what each one draws, for the instant `2026-09-07T19:28:00Z`.

| export | draws | for |
|---|---|---|
| `CLUB_TIMEZONE` | `Africa/Nouakchott` | the one timezone |
| `formatDateTime` | `2026/09/07 19:28` | a stamp on a record |
| `formatDate` | `2026/09/07` | a day with no hour to it |
| `formatTime` | `19:28` | an hour under a heading that carries the day |
| `formatLongDate` | `الاثنين، 7 سبتمبر 2026` | a heading above a day's rows, and nothing else |
| `formatDayKey` | `2026/09/07` | a stored day key drawn as a date |
| `matchDateKey` | `2026-09-07` | grouping and sorting, never a screen |
| `todayClubDateKey` | the same key for today | comparing a stored day against now |
| `parseMatchDate` | a `Date` | reading a `datetime-local` as club wall clock |
| `matchDateToLocalInput` | `2026-09-07T19:28` | filling a `datetime-local` back in |

`clubOffsetMs`, `toClubWallClock` and `fromClubWallClock` are the plumbing under those. A
screen has no reason to call them.

## The two exceptions

Both are allowed, and both are named here because an exception nobody wrote down is how the
seventh way starts.

### The long Arabic heading

`formatLongDate`, above a day's matches, on the tournament admin and on the member's matches
list.

It is allowed because it is a heading rather than a record. Somebody scanning a list of days
reads a weekday faster than a numeric date, and the heading is what tells them which block of
rows they are looking at. It carries the year, so it is not the yearless label #1761 found
and #1800 fixed.

It is not a substitute for the numeric shape. A row that records when something happened
draws `formatDateTime`, whatever the heading above it says.

It asks `Intl` for `ar` and passes `CLUB_TIMEZONE`. It carries no month table of its own, and
neither may anything else.

### The export

A CSV cell and an export filename use `YYYY-MM-DD`, the ISO day, in
`src/app/api/admin/export/[dataset]/route.ts` and the client side exports beside it.

Nobody reads those in Arabic. A spreadsheet parses the ISO day as a date and sorts it, and a
filename with slashes in it is not a filename. The rule above is about what a person reads on
a screen, and this is what a machine reads out of a file.
