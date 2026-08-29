import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TournamentSummary from "./TournamentSummary";

function show(bestAttack: { name: string; gf: number } | null) {
  cleanup();
  render(
    <TournamentSummary
      matchesPlayed={10}
      totalGoals={16}
      avgGoalsPerMatch={1.6}
      bestAttack={bestAttack}
    />,
  );
}

describe("the best attack box", () => {
  it("keeps a latin suffix with the team name instead of letting it drift past the count", () => {
    show({ name: "كاستيا A", gf: 9 });

    const name = screen.getByText("كاستيا A");
    expect(name.tagName).toBe("BDI");
    expect(screen.getByText("(9)").tagName).toBe("BDI");
  });

  it("isolates the name and the count from each other", () => {
    show({ name: "كاستيا A", gf: 9 });

    expect(screen.getByText("كاستيا A")).not.toBe(screen.getByText("(9)"));
  });

  it("shows a dash when no team has played", () => {
    show(null);

    expect(screen.getByText("—")).toBeDefined();
  });
});
