import { describe, it, expect } from "vitest";
import { teamIsFull, incompleteTeams, displayTeamName, placeholderTeamName } from "@/lib/teamSize";

const pair = (id: string, name: string, memberNames: string[], autoNamed = true) => ({
  id,
  name,
  autoNamed,
  memberNames,
});

describe("teamIsFull", () => {
  it("never fills an open-size squad", () => {
    expect(teamIsFull(30, null)).toBe(false);
  });

  it("fills at the declared size", () => {
    expect(teamIsFull(1, 2)).toBe(false);
    expect(teamIsFull(2, 2)).toBe(true);
    expect(teamIsFull(3, 2)).toBe(true);
  });
});

describe("incompleteTeams", () => {
  const teams = [
    pair("a", "", ["أحمد", "محمد"]),
    pair("b", "", ["سالم"]),
    pair("c", "", ["علي", "يحيى", "إبراهيم"]),
  ];

  it("finds the short and the over-full alike", () => {
    expect(incompleteTeams(teams, 2).map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("has nothing to say about open-size squads", () => {
    expect(incompleteTeams(teams, null)).toEqual([]);
  });
});

describe("displayTeamName", () => {
  it("keeps a typed name", () => {
    expect(displayTeamName(pair("a", "النجم", ["أحمد", "محمد"], false), 2)).toBe("النجم");
  });

  it("joins the members when the pair was never named", () => {
    expect(displayTeamName(pair("a", "فريق 1", ["أحمد", "محمد"]), 2)).toBe("أحمد و محمد");
  });

  it("follows a substitution, since it is computed not stored", () => {
    expect(displayTeamName(pair("a", "فريق 1", ["أحمد", "سالم"]), 2)).toBe("أحمد و سالم");
  });

  it("falls back to the placeholder while a pair has nobody yet", () => {
    expect(displayTeamName(pair("a", "فريق 1", []), 2)).toBe("فريق 1");
  });

  it("leaves an open-size squad on its stored name", () => {
    expect(displayTeamName(pair("a", "النجم", ["أحمد"], false), null)).toBe("النجم");
  });
});

describe("placeholderTeamName", () => {
  it("names a pair the admin did not name", () => {
    expect(placeholderTeamName(3)).toBe("فريق 3");
  });
});
