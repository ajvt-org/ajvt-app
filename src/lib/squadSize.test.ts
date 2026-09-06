import { describe, it, expect } from "vitest";
import {
  teamIsFull,
  incompleteTeams,
  displayTeamName,
  placeholderTeamName,
  rosterFault,
  squadLabel,
  isSinglesSquad,
  OPEN_SQUAD,
} from "@/lib/squadSize";

const pair = (id: string, name: string, memberNames: string[], autoNamed = true) => ({
  id,
  name,
  autoNamed,
  memberNames,
});

const exactly = (size: number) => ({ min: size, max: size });

describe("teamIsFull", () => {
  it("never fills an open-size squad", () => {
    expect(teamIsFull(30, OPEN_SQUAD)).toBe(false);
  });

  it("fills at the declared size", () => {
    expect(teamIsFull(1, exactly(2))).toBe(false);
    expect(teamIsFull(2, exactly(2))).toBe(true);
    expect(teamIsFull(3, exactly(2))).toBe(true);
  });

  it("fills at the maximum of a range", () => {
    expect(teamIsFull(16, { min: 16, max: 22 })).toBe(false);
    expect(teamIsFull(22, { min: 16, max: 22 })).toBe(true);
  });

  it("never fills a squad that only carries a minimum", () => {
    expect(teamIsFull(40, { min: 16, max: null })).toBe(false);
  });
});

describe("rosterFault", () => {
  it("calls a squad under the minimum short", () => {
    expect(rosterFault(15, { min: 16, max: 22 })).toBe("short");
  });

  it("calls a squad over the maximum over", () => {
    expect(rosterFault(23, { min: 16, max: 22 })).toBe("over");
  });

  it("finds nothing wrong inside the range", () => {
    expect(rosterFault(16, { min: 16, max: 22 })).toBeNull();
    expect(rosterFault(22, { min: 16, max: 22 })).toBeNull();
  });

  it("finds nothing wrong when no size is set", () => {
    expect(rosterFault(0, OPEN_SQUAD)).toBeNull();
  });
});

describe("incompleteTeams", () => {
  const teams = [
    pair("a", "", ["أحمد", "محمد"]),
    pair("b", "", ["سالم"]),
    pair("c", "", ["علي", "يحيى", "إبراهيم"]),
  ];

  it("finds the short and the over-full alike", () => {
    expect(incompleteTeams(teams, exactly(2)).map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("leaves alone what sits inside the range", () => {
    expect(incompleteTeams(teams, { min: 2, max: 3 }).map((t) => t.id)).toEqual(["b"]);
  });

  it("has nothing to say about open-size squads", () => {
    expect(incompleteTeams(teams, OPEN_SQUAD)).toEqual([]);
  });
});

describe("displayTeamName", () => {
  it("keeps a typed name", () => {
    expect(displayTeamName(pair("a", "النجم", ["أحمد", "محمد"], false), exactly(2))).toBe("النجم");
  });

  it("joins the members when the pair was never named", () => {
    expect(displayTeamName(pair("a", "فريق 1", ["أحمد", "محمد"]), exactly(2))).toBe("أحمد و محمد");
  });

  it("follows a substitution, since it is computed not stored", () => {
    expect(displayTeamName(pair("a", "فريق 1", ["أحمد", "سالم"]), exactly(2))).toBe("أحمد و سالم");
  });

  it("falls back to the placeholder while a pair has nobody yet", () => {
    expect(displayTeamName(pair("a", "فريق 1", []), exactly(2))).toBe("فريق 1");
  });

  it("leaves an open-size squad on its stored name", () => {
    expect(displayTeamName(pair("a", "النجم", ["أحمد"], false), OPEN_SQUAD)).toBe("النجم");
  });
});

describe("reading a squad size", () => {
  it("knows singles from a squad of one", () => {
    expect(isSinglesSquad(exactly(1))).toBe(true);
    expect(isSinglesSquad({ min: 1, max: 2 })).toBe(false);
    expect(isSinglesSquad(OPEN_SQUAD)).toBe(false);
  });

  it("labels a fixed squad with the one number", () => {
    expect(squadLabel(exactly(11))).toBe("11");
  });

  it("labels a range with both ends", () => {
    expect(squadLabel({ min: 16, max: 22 })).toBe("16-22");
  });

  it("labels a squad with only one end set", () => {
    expect(squadLabel({ min: 16, max: null })).toBe("16+");
    expect(squadLabel({ min: null, max: 22 })).toBe("22");
  });

  it("has no label for an open squad", () => {
    expect(squadLabel(OPEN_SQUAD)).toBeNull();
  });
});

describe("placeholderTeamName", () => {
  it("names a pair the admin did not name", () => {
    expect(placeholderTeamName(3)).toBe("فريق 3");
  });
});
