import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import StandingsTable from "./StandingsTable";
import { matchDisplay, publicTournament } from "@/lib/texts";

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
    scoredFor: 3,
    scoredAgainst: 2,
    difference: 1,
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
    scoredFor: 1,
    scoredAgainst: 2,
    difference: -1,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StandingsTable", () => {
  it("is columns of numbers about the season and nothing else", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<StandingsTable title="المجموعة الأولى" rows={rows} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("columnheader")).toHaveLength(10);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("asks the server nothing of its own, whoever is reading it", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<StandingsTable title="المجموعة الأولى" rows={rows} entrant="player" />);

    expect(fetchMock).not.toHaveBeenCalled();
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
            scoredFor: 5,
            scoredAgainst: 2,
            difference: 3,
          },
        ]}
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
      <StandingsTable title="المجموعة 2" rows={rows.map((r) => ({ ...r, unresolved: true }))} />,
    );

    expect(screen.queryByText(matchDisplay.tieMark)).toBeNull();
  });

  it("leaves the team name room to be read", () => {
    cleanup();
    render(
      <StandingsTable title="المجموعة 2" rows={rows.map((r) => ({ ...r, unresolved: true }))} />,
    );

    expect(screen.getByText(rows[0].name)).toBeDefined();
  });

  it("heads the entrant column with the team word by default", () => {
    render(<StandingsTable title={null} rows={rows} />);

    expect(screen.getByText(publicTournament.entrant.team.column)).toBeDefined();
  });

  it("heads it with the player word on a singles tournament", () => {
    render(<StandingsTable title={null} rows={rows} entrant="player" />);

    expect(screen.getByText(publicTournament.entrant.player.column)).toBeDefined();
    expect(screen.queryByText(publicTournament.entrant.team.column)).toBeNull();
  });
});

describe("a table of a tournament played in parts", () => {
  const seriesRow = {
    teamId: "t1",
    name: "أحمد",
    logo: null,
    points: 3,
    played: 2,
    won: 1,
    drawn: 1,
    lost: 0,
    scoredFor: 3,
    scoredAgainst: 1,
    difference: 2,
  };

  it("names the columns for parts rather than goals", () => {
    render(<StandingsTable title={null} rows={[seriesRow]} series />);

    expect(screen.getByText("له")).toBeDefined();
    expect(screen.getByText("عليه")).toBeDefined();
  });

  it("renders a half as a half rather than a decimal", () => {
    const { container } = render(<StandingsTable title={null} rows={[seriesRow]} series />);

    expect(container.textContent).toContain("1½");
    expect(container.textContent).not.toContain("0.5");
  });

  it("renders a side driven below nothing with the sign in front", () => {
    const { container } = render(
      <StandingsTable
        title={null}
        rows={[{ ...seriesRow, points: -4, scoredFor: 0, scoredAgainst: 8, difference: -8 }]}
        series
      />,
    );

    expect(container.textContent).toContain("−2");
    expect(container.textContent).toContain("−4");
  });

  it("leaves a football table counting whole goals", () => {
    const { container } = render(<StandingsTable title={null} rows={[seriesRow]} />);

    expect(container.textContent).not.toContain("½");
  });
});

describe("a member reading their own standings", () => {
  const mineOf = (container: HTMLElement) =>
    [...container.querySelectorAll("tbody tr")].filter((row) =>
      (row.getAttribute("style") ?? "").includes("var(--mint-50)"),
    );

  it("marks nobody when no viewer is given", () => {
    const { container } = render(<StandingsTable title={null} rows={rows} />);

    expect(mineOf(container)).toHaveLength(0);
  });

  it("marks the viewer's row and no other", () => {
    const { container } = render(<StandingsTable title={null} rows={rows} viewerTeamId="b" />);

    expect(mineOf(container)).toHaveLength(1);
    expect(mineOf(container)[0].textContent).toContain("فريق الوحدة");
  });

  it("edges the row as well as tinting it, since the tint is faint on a table", () => {
    const { container } = render(<StandingsTable title={null} rows={rows} viewerTeamId="b" />);

    const first = mineOf(container)[0].querySelector("td");
    expect(first?.getAttribute("style")).toContain("var(--mint-600)");
  });

  it("leaves the rows in rank order rather than lifting the viewer's", () => {
    const { container } = render(<StandingsTable title={null} rows={rows} viewerTeamId="b" />);

    const names = [...container.querySelectorAll("bdi")].map((n) => n.textContent);
    expect(names).toEqual([rows[0].name, rows[1].name]);
  });

  it("marks nobody for a viewer who is in none of these teams", () => {
    const { container } = render(<StandingsTable title={null} rows={rows} viewerTeamId="nobody" />);

    expect(mineOf(container)).toHaveLength(0);
  });
});
