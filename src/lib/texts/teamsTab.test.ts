import { describe, it, expect } from "vitest";
import { teamsTab } from "./teamsTab";

describe("teams tab texts", () => {
  it("counts the roster against the size the tournament asks for", () => {
    expect(teamsTab.rosterOf(3, 5)).toBe("3 / 5");
    expect(teamsTab.teamCount(4)).toContain("4");
  });

  it("counts the players on their own when no size is set", () => {
    expect(teamsTab.rosterCount(1)).toBe("لاعب واحد");
    expect(teamsTab.rosterCount(2)).toBe("لاعبان");
    expect(teamsTab.rosterCount(5)).toBe("5 لاعبين");
    expect(teamsTab.rosterCount(12)).toBe("12 لاعباً");
  });

  it("weaves the name into the lines about one player", () => {
    for (const line of [
      teamsTab.makeCaptain("أحمد"),
      teamsTab.clearCaptain("أحمد"),
      teamsTab.acceptOf("أحمد"),
      teamsTab.rejectOf("أحمد"),
      teamsTab.removeOf("أحمد"),
      teamsTab.openCardOf("أحمد"),
    ]) {
      expect(line).toContain("أحمد");
    }
  });

  it("counts what is waiting and what is unassigned", () => {
    expect(teamsTab.awaitingCount(2)).toContain("2");
    expect(teamsTab.unassigned(7)).toContain("7");
  });
});
