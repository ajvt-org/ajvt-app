import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityRowCard from "./ActivityRowCard";
import type { ActivityRow } from "@/lib/memberActivities";

function row(detail: ActivityRow["detail"], title = "البطولة"): ActivityRow {
  return { activityId: "a1", title, detail, when: null };
}

const fixture = {
  id: "m1",
  matchDate: "2026-09-01T16:00:00.000Z",
  round: null,
  venue: null,
  status: "SCHEDULED",
  isKnockout: false,
  firstTeam: { id: "t1", name: "النسور" },
  secondTeam: { id: "t2", name: "الصقور" },
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  activity: { id: "a1", title: "البطولة" },
  myTeamId: "t1",
};

describe("an activity row", () => {
  it("names my team and the opponent for a scheduled match", () => {
    render(<ActivityRowCard from="/home" row={row({ kind: "NEXT_MATCH", fixture })} />);
    expect(screen.getByText(/النسور ضد الصقور/)).toBeDefined();
  });

  it("reads the opponent off the other side when I am away", () => {
    render(
      <ActivityRowCard
        from="/home"
        row={row({ kind: "NEXT_MATCH", fixture: { ...fixture, myTeamId: "t2" } })}
      />,
    );
    expect(screen.getByText(/الصقور ضد النسور/)).toBeDefined();
  });

  it("names the partner rather than a team for a pair", () => {
    render(
      <ActivityRowCard from="/home" row={row({ kind: "PARTNERS", names: ["محمد ولد أحمد"] })} />,
    );
    expect(screen.getByText(/شريكك محمد ولد أحمد/)).toBeDefined();
  });

  it("says nothing about a team for an activity that has none", () => {
    render(
      <ActivityRowCard
        from="/home"
        row={row({ kind: "DATES", text: "12 - 15 سبتمبر" }, "القافلة الصحية")}
      />,
    );
    expect(screen.getByText("القافلة الصحية")).toBeDefined();
    expect(screen.getByText(/12 - 15 سبتمبر/)).toBeDefined();
    expect(screen.queryByText(/فريق/)).toBeNull();
  });

  it("says a team tournament is waiting for the member to join one", () => {
    render(<ActivityRowCard from="/home" row={row({ kind: "AWAITING_TEAM" }, "كأس الرابطة")} />);
    expect(screen.getByText(/في انتظار انضمامك إلى فريق/)).toBeDefined();
  });

  it("waits for the schedule without naming a team when there is none to name", () => {
    render(
      <ActivityRowCard
        from="/home"
        row={row({ kind: "AWAITING_SCHEDULE", team: null }, "بطولة الشطرنج")}
      />,
    );
    expect(screen.getByText("في انتظار برمجة المباريات")).toBeDefined();
  });

  it("leads with a decision still pending", () => {
    render(<ActivityRowCard from="/home" row={row({ kind: "PENDING_REVIEW" })} />);
    expect(screen.getByText(/قيد المراجعة/)).toBeDefined();
  });

  it("links to the activity and names the screen it was opened from", () => {
    render(<ActivityRowCard from="/home" row={row({ kind: "REGISTERED" })} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/activities/a1?from=%2Fhome");
  });
});
