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

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.getAttribute("style")).toContain("auto auto minmax(0,1fr) auto");
    expect(grid.childElementCount).toBe(8);
  });

  it("puts the icon before the photo, then the name, then the minute", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    const cells = [...(container.firstElementChild?.children ?? [])];
    expect(cells[0].querySelector("svg")).not.toBeNull();
    expect(cells[1].querySelector("svg,img")).not.toBeNull();
    expect(cells[2].textContent).toBe("أسامه محمد");
    expect(cells[3].textContent).toBe("7'");
  });

  it("centers the icon and the photo on the first line of a name that wraps", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    const cells = [...(container.firstElementChild?.children ?? [])];
    expect(cells[0].className).toContain("items-center");
    expect(cells[1].className).toContain("items-center");
    expect(cells[2].className).toContain("leading-6");
  });

  it("breaks a hat-trick's minutes into rows of two", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[{ ...row, minutes: ["7'", "30'", "45'", "60'", "88'"] }]} />,
    );

    const minutes = [...(container.firstElementChild?.children ?? [])][3];
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

    const cells = [...(container.firstElementChild?.children ?? [])];
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
  });

  it("stays one list when no row carries a side", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[row]} />);

    expect(container.querySelectorAll(".flex.gap-3")).toHaveLength(0);
  });
});
