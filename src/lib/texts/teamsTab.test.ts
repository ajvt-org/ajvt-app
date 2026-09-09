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

  it("counts the join requests waiting on a team", () => {
    expect(teamsTab.requestCount(1)).toBe("طلب انضمام واحد");
    expect(teamsTab.requestCount(2)).toBe("طلبا انضمام");
    expect(teamsTab.requestCount(3)).toBe("3 طلبات انضمام");
    expect(teamsTab.requestCount(11)).toBe("11 طلب انضمام");
  });

  it("counts the invitations nobody answered", () => {
    expect(teamsTab.invitationCount(1)).toBe("دعوة واحدة لم يُرد عليها");
    expect(teamsTab.invitationCount(2)).toBe("دعوتان لم يُرد عليهما");
    expect(teamsTab.invitationCount(3)).toBe("3 دعوات لم يُرد عليها");
    expect(teamsTab.invitationCount(11)).toBe("11 دعوة لم يُرد عليها");
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
