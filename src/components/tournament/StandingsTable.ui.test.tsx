import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StandingsTable from "./StandingsTable";

const rows = [
  {
    teamId: "a",
    name: "فريق النجم",
    logo: null,
    points: 4,
    played: 2,
    won: 1,
    drawn: 1,
    lost: 0,
    gf: 3,
    ga: 2,
    gd: 1,
  },
  {
    teamId: "b",
    name: "فريق الوحدة",
    logo: null,
    points: 1,
    played: 2,
    won: 0,
    drawn: 1,
    lost: 1,
    gf: 1,
    ga: 2,
    gd: -1,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StandingsTable", () => {
  it("leaves the follow column out for a reader who cannot follow", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<StandingsTable title="المجموعة الأولى" rows={rows} showFollow={false} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("columnheader")).toHaveLength(10);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives a signed-in reader one follow control per team", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ loggedIn: true }) }),
    );

    render(<StandingsTable title="المجموعة الأولى" rows={rows} showFollow={true} />);

    await waitFor(() => expect(screen.getAllByRole("button")).toHaveLength(rows.length));
    expect(screen.getAllByRole("columnheader")).toHaveLength(11);
  });
});
