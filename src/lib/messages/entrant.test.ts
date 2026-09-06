import { describe, it, expect } from "vitest";
import { entrantWording } from "./entrant";

const TEAM_WORD = /فريق|الفرق|فرق /;
const PLAYER_WORD = "لاعب";

const rendered = (entrant: "team" | "player") => {
  const words = entrantWording(entrant);
  return Object.values(words).map((value) =>
    typeof value === "function" ? value(1, 1, "س") : value,
  );
};

describe("the vocabulary a tournament speaks", () => {
  it("says team everywhere for a tournament played by teams", () => {
    for (const line of rendered("team")) {
      expect(line).toMatch(TEAM_WORD);
    }
  });

  it("never says team for a tournament played by one person a side", () => {
    for (const line of rendered("player")) {
      expect(line).not.toMatch(TEAM_WORD);
    }
  });

  it("says player or entrant on every line of the singles vocabulary", () => {
    for (const line of rendered("player")) {
      expect(line.includes(PLAYER_WORD) || line.includes("مشارك")).toBe(true);
    }
  });

  it("covers the same keys on both sides", () => {
    expect(Object.keys(entrantWording("player"))).toEqual(Object.keys(entrantWording("team")));
  });

  it("drops the squad range from a singles roster complaint, which is always one", () => {
    expect(entrantWording("player").entrantsIncomplete(1, 1, "محمد")).toContain("محمد");
    expect(entrantWording("player").entrantsIncomplete(1, 1, "محمد")).not.toContain("1");
    expect(entrantWording("team").entrantsIncomplete(5, 7, "أ")).toContain("5 إلى 7");
  });
});
