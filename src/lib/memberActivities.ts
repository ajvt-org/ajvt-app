import { sortUpcoming, type Fixture } from "./memberFixtures";

export interface ActivityTeam {
  id: string;
  name: string;
  autoNamed: boolean;
  teammates: string[];
}

export interface MemberActivity {
  activityId: string;
  title: string;
  isTournament: boolean;
  isVolunteer: boolean;
  teamSize: number | null;
  dates: string | null;
  registrationStatus: string | null;
  team: ActivityTeam | null;
  fixtures: Fixture[];
}

export type ActivityDetail =
  | { kind: "REJECTED" }
  | { kind: "PENDING_REVIEW" }
  | { kind: "NEXT_MATCH"; fixture: Fixture }
  | { kind: "PARTNERS"; names: string[] }
  | { kind: "AWAITING_SCHEDULE"; team: string }
  | { kind: "AWAITING_TEAM" }
  | { kind: "DATES"; text: string }
  | { kind: "TEAM"; name: string }
  | { kind: "REGISTERED" };

export interface ActivityRow {
  activityId: string;
  title: string;
  detail: ActivityDetail;
  when: string | null;
}

export function nextUpcoming(fixtures: Fixture[]): Fixture | null {
  return sortUpcoming(fixtures.filter((f) => f.status !== "PLAYED"))[0] ?? null;
}

export function activityDetail(entry: MemberActivity): ActivityDetail {
  if (entry.registrationStatus === "REJECTED") return { kind: "REJECTED" };
  if (entry.registrationStatus === "PENDING") return { kind: "PENDING_REVIEW" };

  const fixture = nextUpcoming(entry.fixtures);
  if (fixture) return { kind: "NEXT_MATCH", fixture };

  if (entry.team && entry.teamSize !== null && entry.team.teammates.length > 0) {
    return { kind: "PARTNERS", names: entry.team.teammates };
  }
  if (entry.team && entry.isTournament) {
    return { kind: "AWAITING_SCHEDULE", team: entry.team.name };
  }
  if (!entry.team && entry.isTournament) return { kind: "AWAITING_TEAM" };
  if (entry.dates) return { kind: "DATES", text: entry.dates };
  if (entry.team) return { kind: "TEAM", name: entry.team.name };
  return { kind: "REGISTERED" };
}

function weight(detail: ActivityDetail): number {
  switch (detail.kind) {
    case "NEXT_MATCH":
      return 0;
    case "PARTNERS":
    case "AWAITING_SCHEDULE":
    case "AWAITING_TEAM":
      return 1;
    case "DATES":
    case "TEAM":
    case "REGISTERED":
      return 2;
    default:
      return 3;
  }
}

function matchTime(detail: ActivityDetail): number {
  if (detail.kind !== "NEXT_MATCH" || !detail.fixture.matchDate) return Number.MAX_SAFE_INTEGER;
  return new Date(detail.fixture.matchDate).getTime();
}

export function buildActivityRows(entries: MemberActivity[]): ActivityRow[] {
  return entries
    .map((entry) => {
      const detail = activityDetail(entry);
      return {
        activityId: entry.activityId,
        title: entry.title,
        detail,
        when: detail.kind === "NEXT_MATCH" ? detail.fixture.matchDate : entry.dates,
      };
    })
    .sort(
      (a, b) =>
        weight(a.detail) - weight(b.detail) ||
        matchTime(a.detail) - matchTime(b.detail) ||
        a.title.localeCompare(b.title, "ar"),
    );
}
