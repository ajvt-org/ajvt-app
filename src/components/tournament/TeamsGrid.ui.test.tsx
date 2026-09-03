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
