import { describe, it, expect } from "vitest";
import { teamsTab } from "./teamsTab";

describe("teams tab texts", () => {
  it("counts the teams", () => {
    expect(teamsTab.teamCount(4)).toContain("4");
  });

  it("states the squad the tournament asks for as one range", () => {
    expect(teamsTab.squadSize("16-22")).toBe("حجم الفريق 16-22");
    expect(teamsTab.squadSize("11")).toBe("حجم الفريق 11");
  });

  it("counts the players of a team", () => {
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
