import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchEvents from "./MatchEvents";
import type { MatchEventRow } from "@/lib/matchEvents";

const row: MatchEventRow = {
  key: "p1",
  side: null,
  type: "goal",
  name: "أسامه محمد",
  photo: null,
  minutes: ["7'"],
};

describe("MatchEvents", () => {
  it("renders nothing for a match with no events", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("lays the rows on one grid so every column lines up", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[row, { ...row, key: "p2", name: "باه الصبار", minutes: ["10'"] }]} />,
    );

    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.getAttribute("style")).toContain("auto auto minmax(0,1fr) auto");
    expect(grid.childElementCount).toBe(8);
  });

  it("puts the icon before the photo, then the name, then the minute", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    const cells = [...(container.querySelector(".grid")?.children ?? [])];
    expect(cells[0].querySelector("svg")).not.toBeNull();
    expect(cells[1].querySelector("svg,img")).not.toBeNull();
    expect(cells[2].textContent).toBe("أسامه محمد");
    expect(cells[3].textContent).toBe("7'");
  });

  it("centers the icon and the photo on the first line of a name that wraps", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    const cells = [...(container.querySelector(".grid")?.children ?? [])];
    expect(cells[0].className).toContain("items-center");
    expect(cells[1].className).toContain("items-center");
    expect(cells[2].className).toContain("leading-6");
  });

  it("breaks a hat-trick's minutes into rows of two", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[{ ...row, minutes: ["7'", "30'", "45'", "60'", "88'"] }]} />,
    );

    const minutes = [...(container.querySelector(".grid")?.children ?? [])][3];
    expect(minutes.childElementCount).toBe(3);
    expect(minutes.children[0].textContent).toBe("7'30'");
    expect(minutes.children[2].textContent).toBe("88'");
  });

  it("marks a booking with its own card colour", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[{ ...row, type: "red" }]} />);

    expect(container.innerHTML).toContain("بطاقة حمراء");
  });
});

describe("optical centering", () => {
  it("lifts the name and the minutes onto the icon's centre line", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    const cells = [...(container.querySelector(".grid")?.children ?? [])];
    expect(cells[2].className).toContain("optical-name");
    expect(cells[3].querySelector("bdi")?.className).toContain("optical-numeral");
  });
});

describe("two teams", () => {
  const home: MatchEventRow = { ...row, key: "h", side: "home", name: "فريق الشباب" };
  const away: MatchEventRow = { ...row, key: "a", side: "away", name: "فريق الأمل" };

  it("puts the home scorers on the right and the away scorers on the left", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[home, away]} />);

    const columns = container.querySelectorAll(".flex.gap-3 > div");
    expect(columns).toHaveLength(2);
    expect(columns[0].textContent).toContain("فريق الشباب");
    expect(columns[1].textContent).toContain("فريق الأمل");
  });

  it("keeps a column of its own for a side that scored nothing", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[home]} />);

    const columns = container.querySelectorAll(".flex.gap-3 > div");
    expect(columns).toHaveLength(2);
    expect(columns[1].textContent).toBe("");
  });

  it("runs the man of the match under both columns", () => {
    cleanup();
    const motm: MatchEventRow = {
      ...row,
      key: "m",
      side: null,
      type: "motm",
      name: "رجل المباراة: أسامه",
    };
    const { container } = render(<MatchEvents rows={[home, away, motm]} />);

    const last = container.firstElementChild?.lastElementChild;
    expect(last?.textContent).toContain("رجل المباراة");
    expect((last as HTMLElement).className).toContain("justify-center");
  });

  it("stays one list when no row carries a side", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    expect(container.querySelectorAll(".flex.gap-3")).toHaveLength(0);
  });
});

describe("sections", () => {
  const goal: MatchEventRow = { ...row, key: "g", side: "home" };
  const card: MatchEventRow = { ...row, key: "c", side: "away", type: "yellow", name: "باه" };
  const motm: MatchEventRow = {
    ...row,
    key: "m",
    side: null,
    type: "motm",
    name: "أسامه محمد",
    team: "فريق النجم",
  };

  it("keeps the goals and the cards in sections of their own", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal, card]} />);

    const sections = container.firstElementChild as HTMLElement;
    expect(sections.childElementCount).toBe(2);
    expect(sections.children[0].textContent).toContain("أسامه محمد");
    expect(sections.children[1].textContent).toContain("باه");
  });

  it("rules a line off before the man of the match", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal, motm]} />);

    const rule = container.querySelector("[style*='border-top']");
    expect(rule).not.toBeNull();
    expect(rule?.nextElementSibling?.textContent).toContain("رجل المباراة");
  });

  it("names the team the man of the match played for", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal, motm]} />);

    expect(container.textContent).toContain("رجل المباراة: أسامه محمد");
    expect(container.textContent).toContain("(فريق النجم)");
  });

  it("skips the rule when the man of the match is all there is", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[motm]} />);

    const sections = container.firstElementChild as HTMLElement;
    expect(sections.querySelector("[style*='border-top']")).toBeNull();
  });
});

describe("column alignment across sections", () => {
  it("boxes every event icon the same width so the photos line up", () => {
    cleanup();
    const goal: MatchEventRow = { ...row, key: "g", side: "home" };
    const card: MatchEventRow = { ...row, key: "c", side: "home", type: "yellow" };
    const { container } = render(<MatchEvents rows={[goal, card]} />);

    const cells = [...container.querySelectorAll(".grid")].map(
      (grid) => grid.firstElementChild as HTMLElement,
    );
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      expect(cell.className).toContain("w-4");
      expect(cell.className).toContain("justify-center");
    }
  });
});

describe("mirrored away column", () => {
  const home: MatchEventRow = { ...row, key: "h", side: "home" };
  const away: MatchEventRow = { ...row, key: "a", side: "away", name: "باه الصبار" };

  it("turns the away rows around so each side's icon faces the outer edge", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[home, away]} />);

    const [homeGrid, awayGrid] = [...container.querySelectorAll(".grid")];
    expect(homeGrid.firstElementChild?.querySelector("svg")).not.toBeNull();
    expect(awayGrid.lastElementChild?.querySelector("svg")).not.toBeNull();
    expect(homeGrid.lastElementChild?.textContent).toBe("7'");
    expect(awayGrid.firstElementChild?.textContent).toBe("7'");
  });

  it("swaps the column widths to match", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[home, away]} />);

    const [homeGrid, awayGrid] = [...container.querySelectorAll(".grid")];
    expect(homeGrid.getAttribute("style")).toContain("auto auto minmax(0,1fr) auto");
    expect(awayGrid.getAttribute("style")).toContain("auto minmax(0,1fr) auto auto");
  });

  it("keeps both sides' names reading from the same edge", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[home, away]} />);

    const names = [...container.querySelectorAll(".optical-name")] as HTMLElement[];
    expect(names).toHaveLength(2);
    for (const name of names) {
      expect(name.getAttribute("style")).toContain("text-align: start");
    }
  });
});
