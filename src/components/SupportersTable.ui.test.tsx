import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SupportersTable from "./SupportersTable";
import { supporters } from "@/lib/texts";
import type { PublicLeaderboardEntry } from "@/lib/donationsServer";

function entry(
  position: number,
  rank: number,
  name: string,
  total: number,
): PublicLeaderboardEntry {
  return { rank, position, name, photoUrl: null, total, anonymous: false };
}

const sharedFirst = [entry(1, 1, "أحمد", 500), entry(2, 1, "سالم", 500), entry(3, 3, "خديجة", 300)];

function rowOf(name: string) {
  return screen.getByText(name).closest("tr")!;
}

function medalColour(place: number, index = 0) {
  const badge = screen.getAllByLabelText(supporters.place(place))[index];
  return getComputedStyle(badge.querySelector("svg")!).color;
}

describe("the supporters table", () => {
  it("shows two supporters on one total at the same place", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[]} />);

    expect(screen.getAllByLabelText(supporters.place(1))).toHaveLength(2);
  });

  it("leaves the place a tie used up unawarded, so the next one is third", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[]} />);

    expect(screen.queryByLabelText(supporters.place(2))).toBeNull();
    expect(screen.getByLabelText(supporters.place(3))).toBeDefined();
  });

  it("gives both halves of a shared first place the same medal", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[]} />);

    expect(medalColour(1, 1)).toBe(medalColour(1, 0));
    expect(medalColour(3)).not.toBe(medalColour(1));
  });

  it("marks only the reader's own row when they share a place with somebody else", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[2]} />);

    expect(rowOf("سالم").className).toContain("row-mine");
    expect(rowOf("أحمد").className).not.toContain("row-mine");
  });

  it("marks both rows of a reader who holds two places at once", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[1, 3]} />);

    expect(rowOf("أحمد").className).toContain("row-mine");
    expect(rowOf("خديجة").className).toContain("row-mine");
    expect(rowOf("سالم").className).not.toContain("row-mine");
  });

  it("marks nobody when the reader is not on the board", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[]} />);

    expect(document.querySelectorAll(".row-mine")).toHaveLength(0);
  });

  it("keeps a row for every supporter sharing a place", () => {
    render(<SupportersTable initial={sharedFirst} total={3} minePositions={[]} />);

    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});
