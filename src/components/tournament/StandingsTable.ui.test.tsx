import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import StandingsTable from "./StandingsTable";
import { matchDisplay } from "@/lib/texts";

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

describe("a long team name", () => {
  const long = "فريق رابطة شباب قرية التاكلالت الرياضي";

  function table() {
    cleanup();
    return render(
      <StandingsTable
        title="المجموعة الأولى"
        rows={[
          {
            teamId: "t1",
            name: long,
            logo: null,
            points: 7,
            played: 3,
            won: 2,
            drawn: 1,
            lost: 0,
            gf: 5,
            ga: 2,
            gd: 3,
          },
        ]}
        showFollow={false}
      />,
    );
  }

  it("wraps instead of pushing the table wider than its card", () => {
    const { container } = table();

    const cell = [...container.querySelectorAll("td")][1];
    expect(cell.className).not.toContain("whitespace-nowrap");
    expect(cell.className).toContain("text-xs");
  });

  it("keeps the name in its own run so a Latin word cannot flip it", () => {
    const { container } = table();

    const name = container.querySelector("bdi");
    expect(name?.textContent).toBe(long);
    expect(name?.getAttribute("style")).toContain("overflow-wrap: anywhere");
  });
});

describe("a tie no rule can settle", () => {
  it("says nothing about it in the table, the rules book settles it away from here", () => {
    cleanup();
    render(
      <StandingsTable
        title="المجموعة 2"
        showFollow={false}
        rows={rows.map((r) => ({ ...r, unresolved: true }))}
      />,
    );

    expect(screen.queryByText(matchDisplay.tieMark)).toBeNull();
  });

  it("leaves the team name room to be read", () => {
    cleanup();
    render(
      <StandingsTable
        title="المجموعة 2"
        showFollow={false}
        rows={rows.map((r) => ({ ...r, unresolved: true }))}
      />,
    );

    expect(screen.getByText(rows[0].name)).toBeDefined();
  });
});
