import { describe, it, expect } from "vitest";
import { guardNames, unguardedHandlers } from "./routeGuards";

const GUARDS = ["requireUser", "requireAdmin", "requireTeamAccess"];

describe("guardNames", () => {
  it("reads every exported require from the files that hold them", () => {
    const auth = `
      export async function getAdminSession() {}
      export async function requireAdmin() {}
      export async function requireUser(options = {}) {}
    `;
    const access = `
      export async function requireTeamAccess(teamId: string) {}
      export async function scopedActivityIds() {}
    `;

    expect(guardNames(auth, access)).toEqual(["requireAdmin", "requireUser", "requireTeamAccess"]);
  });

  it("does not read a helper that merely reads a session as a guard", () => {
    expect(guardNames("export async function getUserSession() {}")).toEqual([]);
  });
});

describe("unguardedHandlers", () => {
  it("names a handler that reaches no guard", () => {
    const source = `
      export const GET = withRoute("g", async () => {
        return NextResponse.json({});
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual(["GET"]);
  });

  it("says nothing about a handler that calls a guard", () => {
    const source = `
      export const GET = withRoute("g", async () => {
        await requireUser();
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual([]);
  });

  it("counts a guard that is not the two obvious ones", () => {
    const source = `
      export const POST = withRoute("p", async () => {
        await requireTeamAccess(teamId);
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual([]);
  });

  it("does not let a guarded handler vouch for the one beside it", () => {
    const source = `
      export const GET = withRoute("g", async () => {
        await requireUser();
      });
      export const DELETE = withRoute("d", async () => {
        return NextResponse.json({});
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual(["DELETE"]);
  });

  it("does not let a guard above the handlers vouch for any of them", () => {
    const source = `
      async function session() {
        return requireAdmin();
      }
      export const GET = withRoute("g", async () => {
        return session();
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual(["GET"]);
  });

  it("reads a bare function handler as well as an assigned one", () => {
    const source = `
      export async function GET() {
        return NextResponse.json({});
      }
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual(["GET"]);
  });

  it("does not mistake a name that merely ends with a guard name", () => {
    const source = `
      export const GET = withRoute("g", async () => {
        await ownrequireUser();
      });
    `;

    expect(unguardedHandlers(source, GUARDS)).toEqual(["GET"]);
  });
});
