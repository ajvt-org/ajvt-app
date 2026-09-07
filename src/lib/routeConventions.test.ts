import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { guardNames, unguardedHandlers } from "./routeGuards";

const CONST_HANDLER = /export const (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*=\s*(withRoute\()?/g;
const FUNCTION_HANDLER =
  /export (?:async )?function (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*\(/g;

const NOT_YET_WRAPPED = [
  "files/[filename]/route.ts GET",
  "files/activity/[filename]/route.ts GET",
  "files/donation/[filename]/route.ts GET",
  "files/member/[filename]/route.ts GET",
  "files/team/[filename]/route.ts GET",
];

const GUARD_SOURCES = [
  "src/lib/auth.ts",
  "src/lib/activityAccessServer.ts",
  "src/lib/teamBuildingServer.ts",
];

const NO_GUARD: Record<string, string> = {
  "activities/route.ts GET": "the activities list every visitor sees",
  "admin/login/route.ts POST": "signing in is what issues the admin token",
  "admin/logout/route.ts POST": "clearing the cookie needs no session to be valid",
  "ages/route.ts GET": "the approved age groups, shown on public screens",
  "ages/standings/route.ts GET": "the standings, shown on public screens",
  "auth/login/route.ts POST": "signing in is what issues the member token",
  "auth/logout/route.ts POST": "clearing the cookie needs no session to be valid",
  "auth/register/route.ts POST": "signing up happens before there is an account",
  "donations/route.ts POST":
    "a visitor can give without an account, and it is rate limited by address",
  "files/[filename]/route.ts GET":
    "asks for a member or an admin session in the handler rather than through a guard",
  "files/activity/[filename]/route.ts GET": "an activity photo, linked from public screens",
  "files/donation/[filename]/route.ts GET": "a giver photo, linked from the public board",
  "files/member/[filename]/route.ts GET": "a member photo, linked from public screens",
  "files/team/[filename]/route.ts GET": "a team logo, linked from public screens",
  "health/route.ts GET": "the platform reads it before the app has finished booting",
  "leaderboard/route.ts GET": "the leaderboard every visitor sees",
  "payment-methods/route.ts GET": "the ways to pay, shown before anyone signs in",
  "quiz/tutorial/route.ts GET": "the tutorial questions, open to anyone",
  "settings/route.ts GET": "the public settings every screen reads",
  "teams/[teamId]/follow/route.ts GET": "answers that a visitor follows nothing",
  "track-visit/route.ts POST": "anonymous visit counting, rate limited by address",
  "upload/route.ts POST":
    "refuses a caller carrying neither session in the handler rather than through a guard",
  "verify/[memberNumber]/route.ts GET": "retired, and answers the same to everyone",
  "villages/route.ts GET": "the village list, shown on the sign up screen",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

export function unwrappedHandlers(source: string): string[] {
  const wrapped = [...source.matchAll(CONST_HANDLER)].filter((m) => m[2]).map((m) => m[1]);
  const bare = [...source.matchAll(CONST_HANDLER)].filter((m) => !m[2]).map((m) => m[1]);
  const functions = [...source.matchAll(FUNCTION_HANDLER)].map((m) => m[1]);
  return [...bare, ...functions].filter((name) => !wrapped.includes(name));
}

function unwrapped(): string[] {
  return routeFiles("src/app/api").flatMap((path) => {
    const route = path.replace("src/app/api/", "");
    return unwrappedHandlers(readFileSync(path, "utf8")).map((name) => `${route} ${name}`);
  });
}

function guards(): string[] {
  return guardNames(...GUARD_SOURCES.map((path) => readFileSync(path, "utf8")));
}

function unguarded(): string[] {
  const names = guards();
  return routeFiles("src/app/api").flatMap((path) => {
    const route = path.replace("src/app/api/", "");
    return unguardedHandlers(readFileSync(path, "utf8"), names).map((name) => `${route} ${name}`);
  });
}

describe("route conventions", () => {
  it("finds the handlers across every route file", () => {
    const total = routeFiles("src/app/api").length;
    expect(total).toBeGreaterThan(100);
  });

  it("reads a handler as wrapped only when withRoute is what it is assigned", () => {
    const source = `
      export const GET = withRoute("g", async () => {});
      export const POST = async () => {};
      export async function DELETE() {}
    `;
    expect(unwrappedHandlers(source)).toEqual(["POST", "DELETE"]);
  });

  it("does not let a wrapped handler vouch for a bare one beside it", () => {
    const source = `
      export const GET = withRoute("g", async () => {});
      export const PATCH = async () => {};
    `;
    expect(unwrappedHandlers(source)).toEqual(["PATCH"]);
  });

  it("leaves no route handler outside withRoute except the ones already known", () => {
    expect(unwrapped().sort()).toEqual([...NOT_YET_WRAPPED].sort());
  });

  it("keeps the debt list honest, with nothing on it that is already wrapped", () => {
    const outstanding = unwrapped();
    expect(NOT_YET_WRAPPED.filter((entry) => !outstanding.includes(entry))).toEqual([]);
  });
});

describe("every route reaches a guard", () => {
  it("finds the guards in the files that hold them", () => {
    expect(guards()).toEqual([
      "requireAdmin",
      "requireAdminRole",
      "requireArea",
      "requireOwner",
      "requireUser",
      "requireUnscopedAdmin",
      "requireActivityAccess",
      "requireActivityFinanceAccess",
      "requireMatchAccess",
      "requireTeamAccess",
      "requireGroupAccess",
      "requireBookingAccess",
      "requireTeamBuilder",
      "requireCaptainOf",
    ]);
  });

  it("leaves no handler reaching no guard except the ones meant to be open", () => {
    expect(unguarded().sort()).toEqual(Object.keys(NO_GUARD).sort());
  });

  it("keeps the open list honest, with nothing on it that is already guarded", () => {
    const outstanding = unguarded();
    expect(Object.keys(NO_GUARD).filter((entry) => !outstanding.includes(entry))).toEqual([]);
  });

  it("says why each open route is open", () => {
    expect(Object.entries(NO_GUARD).filter(([, why]) => why.trim().length === 0)).toEqual([]);
  });
});
