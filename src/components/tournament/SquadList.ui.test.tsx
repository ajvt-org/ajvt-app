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

function show(players: SquadPlayer[], captainId: string | null = null) {
  cleanup();
  return render(<SquadList players={players} captainId={captainId} />);
}

function names(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li")].map((row) =>
    (row.querySelector("span.text-sm")?.textContent ?? "").trim(),
  );
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

  it("names the captain and puts them first", () => {
    const { container } = show(squad(4), "p2");

    expect(names(container)[0]).toBe("لاعب 2");
    expect(screen.getByText("القائد")).toBeDefined();
  });

  it("gives the captain the whole row so the badge fits beside the name", () => {
    const { container } = show(squad(4), "p2");

    const rows = [...container.querySelectorAll("li")];
    expect(rows[0].className).toContain("col-span-full");
    expect(rows[1].className).not.toContain("col-span-full");
  });

  it("marks one captain and no one else", () => {
    show(squad(4), "p2");

    expect(screen.getAllByText("القائد")).toHaveLength(1);
  });

  it("leaves a squad with no captain exactly as it was", () => {
    const { container } = show(squad(4));

    expect(names(container)).toEqual(["لاعب 0", "لاعب 1", "لاعب 2", "لاعب 3"]);
    expect(screen.queryByText("القائد")).toBeNull();
    expect(container.querySelector(".badge")).toBeNull();
  });

  it("stays as it was when the captain has left the squad", () => {
    const { container } = show(squad(4), "gone");

    expect(names(container)).toEqual(["لاعب 0", "لاعب 1", "لاعب 2", "لاعب 3"]);
    expect(screen.queryByText("القائد")).toBeNull();
  });
});
