import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SquadList, { type SquadPlayer } from "./SquadList";

function squad(size: number): SquadPlayer[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `p${i}`,
    fullName: `لاعب ${i}`,
    photo: null,
  }));
}

function show(players: SquadPlayer[]) {
  cleanup();
  return render(<SquadList players={players} />);
}

describe("SquadList", () => {
  it("lays the players out in tracks that fill the width", () => {
    const { container } = show(squad(12));

    const list = container.querySelector("ul") as HTMLElement;
    expect(list.className).toContain("grid");
    expect(list.className).toContain("[grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))]");
  });

  it("gives a short squad the same track width as a long one", () => {
    const two = show(squad(2)).container.querySelector("ul") as HTMLElement;
    const twelve = show(squad(12)).container.querySelector("ul") as HTMLElement;

    expect(two.className).toBe(twelve.className);
  });

  it("reads a name as content rather than as a caption", () => {
    show(squad(1));

    const name = screen.getByText("لاعب 0");
    expect(name.className).toContain("text-sm");
    expect(name.className).not.toContain("text-xs");
    expect(name.getAttribute("style")).toContain("var(--text-main)");
  });

  it("says an empty squad is empty", () => {
    const { container } = show([]);

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
    expect(container.querySelector("ul")).toBeNull();
  });
});
