import { describe, it, expect } from "vitest";
import { membershipIsLocked, type LockedTournament } from "./teamLock";

const NOW = new Date("2026-09-20T12:00:00.000Z");

const tournament = (over: Partial<LockedTournament> = {}): LockedTournament => ({
  isTournament: true,
  minTeamSize: 2,
  maxTeamSize: 4,
  playersBuildTeams: true,
  startsAt: null,
  ...over,
});

describe("when a player stops being free to change team", () => {
  it("stays open while the tournament has no start date at all", () => {
    expect(membershipIsLocked(tournament(), NOW)).toBe(false);
  });

  it("stays open until the start", () => {
    expect(
      membershipIsLocked(tournament({ startsAt: new Date("2026-09-21T00:00:00.000Z") }), NOW),
    ).toBe(false);
  });

  it("closes on the stroke of the start", () => {
    expect(membershipIsLocked(tournament({ startsAt: NOW }), NOW)).toBe(true);
  });

  it("stays closed after the start", () => {
    expect(
      membershipIsLocked(tournament({ startsAt: new Date("2026-09-19T00:00:00.000Z") }), NOW),
    ).toBe(true);
  });

  it("is closed on a tournament whose teams the admin arranges, whatever the date says", () => {
    expect(
      membershipIsLocked(
        tournament({ playersBuildTeams: false, startsAt: new Date("2026-12-31T00:00:00.000Z") }),
        NOW,
      ),
    ).toBe(true);
  });

  it("is closed on a singles tournament, where a registrant is their own entrant", () => {
    expect(membershipIsLocked(tournament({ minTeamSize: 1, maxTeamSize: 1 }), NOW)).toBe(true);
  });
});
