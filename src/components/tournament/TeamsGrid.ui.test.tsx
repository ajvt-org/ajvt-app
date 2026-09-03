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

function show(teams: ReturnType<typeof team>[], viewerId: string | null = null) {
  cleanup();
  return render(<TeamsGrid teams={teams} viewerId={viewerId} />);
}

function order(container: HTMLElement): string[] {
  return [...container.querySelectorAll("span.flex-1")].map((name) =>
    (name.textContent ?? "").trim(),
  );
}

function markedCard(container: HTMLElement): string[] {
  return [...container.querySelectorAll(".card")]
    .filter((card) => (card.getAttribute("style") ?? "").includes("var(--mint-600)"))
    .map((card) => (card.querySelector("span.flex-1")?.textContent ?? "").trim());
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

  it("says an empty team is empty without opening it", () => {
    const { container } = show([team("فريق الشباب", 0)]);

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector(".disclosure-chevron")).toBeNull();
  });

  it("keeps the empty team in the list beside the others", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الشباب", 0)]);

    expect(order(container)).toEqual(["فريق النجم", "فريق الشباب"]);
    expect(container.querySelectorAll(".card")).toHaveLength(2);
  });

  it("leaves the teams that have players opening as they did", () => {
    const { container } = show([team("فريق الشباب", 0), team("فريق النجم", 3)]);

    const card = container.querySelector("details");
    expect(card?.querySelector("summary")).not.toBeNull();
    expect(card?.querySelector(".disclosure-chevron")).not.toBeNull();
  });

  it("does not dress the empty team's heading as something to tap", () => {
    const { container } = show([team("فريق الشباب", 0)]);

    const head = container.querySelector(".card > *") as HTMLElement;
    expect(head.tagName).toBe("P");
    expect(head.className).not.toContain("cursor-pointer");
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

  it("lifts the viewer's own team above the rest", () => {
    const { container } = show(
      [team("فريق النجم", 3), team("فريق الوحدة", 3), team("فريق الأمل", 3)],
      "فريق الوحدة-1",
    );

    expect(order(container)[0]).toBe("فريق الوحدة");
  });

  it("marks the viewer's own team and no other", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الوحدة", 3)], "فريق الوحدة-1");

    expect(markedCard(container)).toEqual(["فريق الوحدة"]);
  });

  it("leaves the list as it was for a viewer who is in no team", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الوحدة", 3)], "nobody");

    expect(order(container)).toEqual(["فريق النجم", "فريق الوحدة"]);
    expect(markedCard(container)).toEqual([]);
  });

  it("leaves the list as it was for a viewer who is signed out", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الوحدة", 3)]);

    expect(order(container)).toEqual(["فريق النجم", "فريق الوحدة"]);
    expect(markedCard(container)).toEqual([]);
  });

  it("marks the viewer's row inside the team it lifted", () => {
    const { container } = show([team("فريق النجم", 3), team("فريق الوحدة", 3)], "فريق الوحدة-1");

    const first = container.querySelector("details") as HTMLElement;
    const rows = [...first.querySelectorAll("li")].filter((row) =>
      (row.getAttribute("style") ?? "").includes("var(--mint-100)"),
    );
    expect(rows).toHaveLength(1);
  });
});
