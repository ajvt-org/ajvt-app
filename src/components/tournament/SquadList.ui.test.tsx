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

function show(
  players: SquadPlayer[],
  captainId: string | null = null,
  viewerId: string | null = null,
) {
  cleanup();
  return render(<SquadList players={players} captainId={captainId} viewerId={viewerId} />);
}

function marked(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li")]
    .filter((row) => (row.getAttribute("style") ?? "").includes("var(--mint-100)"))
    .map((row) => (row.querySelector("span.text-sm")?.textContent ?? "").trim());
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
    expect(screen.getByRole("img", { name: "القائد" })).toBeDefined();
  });

  it("gives the captain the whole row so the badge fits beside the name", () => {
    const { container } = show(squad(4), "p2");

    const rows = [...container.querySelectorAll("li")];
    expect(rows[0].className).toContain("col-span-full");
    expect(rows[1].className).not.toContain("col-span-full");
  });

  it("marks the captain with no word, and gives the mark the word as its name", () => {
    show(squad(4), "p2");

    const mark = screen.getByRole("img", { name: "القائد" });
    expect(mark.textContent).toBe("");
    expect(mark.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText("القائد")).toBeNull();
  });

  it("marks one captain and no one else", () => {
    show(squad(4), "p2");

    expect(screen.getAllByRole("img", { name: "القائد" })).toHaveLength(1);
  });

  it("leaves a squad with no captain exactly as it was", () => {
    const { container } = show(squad(4));

    expect(names(container)).toEqual(["لاعب 0", "لاعب 1", "لاعب 2", "لاعب 3"]);
    expect(screen.queryByRole("img", { name: "القائد" })).toBeNull();
    expect(container.querySelector(".badge")).toBeNull();
  });

  it("stays as it was when the captain has left the squad", () => {
    const { container } = show(squad(4), "gone");

    expect(names(container)).toEqual(["لاعب 0", "لاعب 1", "لاعب 2", "لاعب 3"]);
    expect(screen.queryByRole("img", { name: "القائد" })).toBeNull();
  });

  it("marks the row the viewer is reading their own name on", () => {
    const { container } = show(squad(4), null, "p2");

    expect(marked(container)).toEqual(["لاعب 2"]);
  });

  it("writes the viewer's own name in the mint the rest of the app marks you with", () => {
    const { container } = show(squad(4), null, "p2");

    const rows = [...container.querySelectorAll("li")];
    expect(rows[2].querySelector("span.text-sm")?.getAttribute("style")).toContain(
      "var(--mint-700)",
    );
    expect(rows[0].querySelector("span.text-sm")?.getAttribute("style")).toContain(
      "var(--text-main)",
    );
  });

  it("leaves the squad unmarked for a viewer who is not on it", () => {
    const { container } = show(squad(4), null, "someone-else");

    expect(marked(container)).toEqual([]);
  });

  it("leaves the squad unmarked for a viewer who is signed out", () => {
    const { container } = show(squad(4), "p1");

    expect(marked(container)).toEqual([]);
    expect(screen.getByRole("img", { name: "القائد" })).toBeDefined();
  });

  it("gives the captain who is also the viewer both marks and one badge", () => {
    const { container } = show(squad(4), "p2", "p2");

    expect(marked(container)).toEqual(["لاعب 2"]);
    expect(screen.getAllByRole("img", { name: "القائد" })).toHaveLength(1);
  });

  it("keeps every row on the same grid line whether it is marked or not", () => {
    const { container } = show(squad(4), null, "p2");

    const classes = [...container.querySelectorAll("li")].map((row) => row.className);
    expect(classes[0]).toBe(classes[2]);
  });
});
