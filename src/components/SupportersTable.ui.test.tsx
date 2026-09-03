import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

function board(minePositions: number[] = [], options: { total?: number; source?: string } = {}) {
  return render(
    <SupportersTable
      initial={sharedFirst}
      total={options.total ?? 3}
      minePositions={minePositions}
      source={options.source ?? "/api/leaderboard"}
    />,
  );
}

function rowOf(name: string) {
  return screen.getByText(name).closest("tr")!;
}

function medalColour(place: number, index = 0) {
  const badge = screen.getAllByLabelText(supporters.place(place))[index];
  return getComputedStyle(badge.querySelector("svg")!).color;
}

describe("the supporters table", () => {
  it("shows two supporters on one total at the same place", () => {
    board();

    expect(screen.getAllByLabelText(supporters.place(1))).toHaveLength(2);
  });

  it("leaves the place a tie used up unawarded, so the next one is third", () => {
    board();

    expect(screen.queryByLabelText(supporters.place(2))).toBeNull();
    expect(screen.getByLabelText(supporters.place(3))).toBeDefined();
  });

  it("gives both halves of a shared first place the same medal", () => {
    board();

    expect(medalColour(1, 1)).toBe(medalColour(1, 0));
    expect(medalColour(3)).not.toBe(medalColour(1));
  });

  it("marks only the reader's own row when they share a place with somebody else", () => {
    board([2]);

    expect(rowOf("سالم").className).toContain("row-mine");
    expect(rowOf("أحمد").className).not.toContain("row-mine");
  });

  it("marks both rows of a reader who holds two places at once", () => {
    board([1, 3]);

    expect(rowOf("أحمد").className).toContain("row-mine");
    expect(rowOf("خديجة").className).toContain("row-mine");
    expect(rowOf("سالم").className).not.toContain("row-mine");
  });

  it("marks nobody when the reader is not on the board", () => {
    board();

    expect(document.querySelectorAll(".row-mine")).toHaveLength(0);
  });

  it("keeps a row for every supporter sharing a place", () => {
    board();

    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});

describe("the supporters table paging", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers no more to load once the board is whole", () => {
    board();

    expect(screen.queryByText(supporters.more)).toBeNull();
  });

  it("reads the next page from the source it was given", async () => {
    const fetched = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [entry(4, 4, "مريم", 100)] }),
    });
    vi.stubGlobal("fetch", fetched);

    board([], { total: 4, source: "/api/admin/supporters" });
    fireEvent.click(screen.getByText(supporters.more));

    await waitFor(() => expect(screen.getByText("مريم")).toBeDefined());
    expect(fetched).toHaveBeenCalledWith("/api/admin/supporters?offset=3");
  });

  it("says so when the next page does not arrive", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    board([], { total: 4 });
    fireEvent.click(screen.getByText(supporters.more));

    await waitFor(() => expect(screen.getByText(supporters.loadFailed)).toBeDefined());
  });
});
