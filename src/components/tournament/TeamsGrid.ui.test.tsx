import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TeamsGrid from "./TeamsGrid";

function team(name: string, size: number, captainUserId: string | null = null) {
  return {
    id: name,
    name,
    logo: null,
    captainUserId,
    members: Array.from({ length: size }, (_, i) => ({
      member: { id: `${name}-${i}`, fullName: `لاعب ${i}`, photo: null },
    })),
  };
}

function show(teams: ReturnType<typeof team>[]) {
  cleanup();
  return render(<TeamsGrid teams={teams} />);
}

describe("TeamsGrid", () => {
  it("says what the number beside the team counts", () => {
    show([team("فريق النجم", 12)]);

    expect(screen.getByText("12 لاعباً")).toBeDefined();
  });

  it("counts two players in the dual", () => {
    show([team("فريق الوحدة", 2)]);

    expect(screen.getByText("لاعبان")).toBeDefined();
  });

  it("keeps every team a card that opens and closes", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الوحدة", 2)]);

    const cards = container.querySelectorAll("details");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector("summary")).not.toBeNull();
  });

  it("leaves an empty squad with its own sentence", () => {
    show([team("فريق الشباب", 0)]);

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
  });

  it("keeps a long team name whole and lets it fold onto another line", () => {
    const long =
      "\u0641\u0631\u064a\u0642 \u0634\u0628\u0627\u0628 \u0642\u0631\u064a\u0629 \u0627\u0644\u062a\u0627\u0643\u0644\u0627\u0644\u062a \u0644\u0643\u0631\u0629 \u0627\u0644\u0642\u062f\u0645";
    const { container } = show([team(long, 3)]);

    const name = screen.getByText(long);
    expect(name.className).not.toContain("truncate");
    expect(name.getAttribute("style")).toContain("break-word");
    expect(container.querySelector("summary")?.className).toContain("items-center");
  });

  it("hands each squad its own captain", () => {
    const { container } = show([
      team("فريق النجم", 3, "فريق النجم-2"),
      team("فريق الوحدة", 3, null),
    ]);

    const cards = [...container.querySelectorAll("details")];
    expect(cards[0].querySelector(".badge")).not.toBeNull();
    expect(cards[1].querySelector(".badge")).toBeNull();
  });
});
