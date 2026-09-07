import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { proxy, config } from "@/proxy";
import { LOGO_PATHS } from "@/lib/logo";

const SECRET = new TextEncoder().encode("test-secret");

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

const COOKIES = {
  visitor: async () => "",
  member: async () =>
    `user_token=${await sign({ typ: "user", userId: "u1", tokenVersion: 0, mustChangePassword: false })}`,
  locked: async () =>
    `user_token=${await sign({ typ: "user", userId: "u1", tokenVersion: 0, mustChangePassword: true })}`,
  forged: async () => "user_token=not.a.real.token",
  admin: async () =>
    `admin_token=${await sign({ typ: "admin", adminId: "a1", username: "admin", tokenVersion: 0 })}`,
};

type State = keyof typeof COOKIES;

async function lands(path: string, state: State): Promise<string> {
  const cookie = await COOKIES[state]();
  const res = await proxy(
    new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} }),
  );
  const location = res.headers.get("location");
  if (!location) return path;
  const url = new URL(location);
  return url.pathname + url.search;
}

const LOGIN = (next: string) => `/login?next=${encodeURIComponent(next)}`;
const ADMIN_LOGIN = (next: string) => `/admin/login?next=${encodeURIComponent(next)}`;
const CHANGE = "/change-password";

const MATRIX: Record<string, Record<State, string>> = {
  "/": { visitor: "self", member: "self", locked: CHANGE, forged: "self", admin: "self" },
  "/activities": {
    visitor: "self",
    member: "self",
    locked: CHANGE,
    forged: "self",
    admin: "self",
  },
  "/donate": { visitor: "self", member: "self", locked: CHANGE, forged: "self", admin: "self" },
  "/quiz": { visitor: "self", member: "self", locked: CHANGE, forged: "self", admin: "self" },
  "/leaderboard": {
    visitor: "self",
    member: "self",
    locked: CHANGE,
    forged: "self",
    admin: "self",
  },
  "/login": { visitor: "self", member: "self", locked: CHANGE, forged: "self", admin: "self" },
  "/forgot-password": {
    visitor: "self",
    member: "self",
    locked: CHANGE,
    forged: "self",
    admin: "self",
  },
  "/form": { visitor: "self", member: "self", locked: CHANGE, forged: "self", admin: "self" },
  "/form?id=m1": {
    visitor: LOGIN("/form?id=m1"),
    member: "self",
    locked: CHANGE,
    forged: LOGIN("/form?id=m1"),
    admin: LOGIN("/form?id=m1"),
  },
  "/membership": {
    visitor: LOGIN("/membership"),
    member: "self",
    locked: CHANGE,
    forged: LOGIN("/membership"),
    admin: LOGIN("/membership"),
  },
  "/membership?id=m1": {
    visitor: LOGIN("/membership?id=m1"),
    member: "self",
    locked: CHANGE,
    forged: LOGIN("/membership?id=m1"),
    admin: LOGIN("/membership?id=m1"),
  },
  "/home": {
    visitor: LOGIN("/home"),
    member: "self",
    locked: CHANGE,
    forged: LOGIN("/home"),
    admin: LOGIN("/home"),
  },
  "/profile": {
    visitor: LOGIN("/profile"),
    member: "self",
    locked: CHANGE,
    forged: LOGIN("/profile"),
    admin: LOGIN("/profile"),
  },
  "/change-password": {
    visitor: LOGIN(CHANGE),
    member: "self",
    locked: "self",
    forged: LOGIN(CHANGE),
    admin: LOGIN(CHANGE),
  },
  "/admin/login": {
    visitor: "self",
    member: "self",
    locked: "self",
    forged: "self",
    admin: "self",
  },
  "/admin/dashboard": {
    visitor: ADMIN_LOGIN("/admin/dashboard"),
    member: ADMIN_LOGIN("/admin/dashboard"),
    locked: ADMIN_LOGIN("/admin/dashboard"),
    forged: ADMIN_LOGIN("/admin/dashboard"),
    admin: "self",
  },
  "/admin": {
    visitor: ADMIN_LOGIN("/admin"),
    member: ADMIN_LOGIN("/admin"),
    locked: ADMIN_LOGIN("/admin"),
    forged: ADMIN_LOGIN("/admin"),
    admin: "self",
  },
  "/admin/members": {
    visitor: ADMIN_LOGIN("/admin/members"),
    member: ADMIN_LOGIN("/admin/members"),
    locked: ADMIN_LOGIN("/admin/members"),
    forged: ADMIN_LOGIN("/admin/members"),
    admin: "self",
  },
  "/admin/tournament/abc": {
    visitor: ADMIN_LOGIN("/admin/tournament/abc"),
    member: ADMIN_LOGIN("/admin/tournament/abc"),
    locked: ADMIN_LOGIN("/admin/tournament/abc"),
    forged: ADMIN_LOGIN("/admin/tournament/abc"),
    admin: "self",
  },
};

describe("proxy routing", () => {
  for (const [path, expected] of Object.entries(MATRIX)) {
    for (const [state, target] of Object.entries(expected) as [State, string][]) {
      it(`${state} at ${path} -> ${target === "self" ? "stays" : target}`, async () => {
        expect(await lands(path, state)).toBe(target === "self" ? path : target);
      });
    }
  }
});

describe("the temporary password lock", () => {
  it("leaves the change form reachable, or there is no way out of it", async () => {
    expect(await lands(CHANGE, "locked")).toBe(CHANGE);
  });

  it("does not follow a member session into the admin area", async () => {
    expect(await lands("/admin/login", "locked")).toBe("/admin/login");
  });

  it("ignores a token it cannot verify rather than trusting the claim", async () => {
    expect(await lands("/donate", "forged")).toBe("/donate");
  });
});

describe("the proxy matcher", () => {
  const pattern = new RegExp(`^${config.matcher[0]}$`);

  it.each([
    "/",
    "/home",
    "/profile",
    "/donate",
    "/quiz",
    "/activities",
    "/activities/abc",
    "/change-password",
    "/form",
    "/membership",
    "/admin",
    "/admin/login",
    "/admin/dashboard",
  ])("covers %s", (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each([
    "/api/user/me",
    "/api/auth/login",
    "/_next/static/chunk.js",
    "/_next/image",
    "/sw.js",
    "/manifest.json",
    "/offline.html",
    "/favicon.ico",
    "/icon-192.png",
    ...LOGO_PATHS,
    "/uploads/photo.webp",
  ])("leaves %s alone", (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});

describe("the script policy", () => {
  async function policyAt(path: string, state: State): Promise<string> {
    const cookie = await COOKIES[state]();
    const res = await proxy(
      new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} }),
    );
    return res.headers.get("content-security-policy") ?? "";
  }

  it("carries a nonce and no inline allowance", async () => {
    const policy = await policyAt("/donate", "visitor");

    expect(policy).toMatch(/script-src [^;]*'nonce-[^']+'/);
    expect(policy.split("; ").find((p) => p.startsWith("script-src"))).not.toContain(
      "'unsafe-inline'",
    );
  });

  it("mints a fresh nonce for every request", async () => {
    const first = await policyAt("/donate", "visitor");
    const second = await policyAt("/donate", "visitor");

    expect(first).not.toBe(second);
  });

  it("hands the page the nonce it names", async () => {
    const res = await proxy(new NextRequest("http://localhost/donate"));
    const policy = res.headers.get("content-security-policy") ?? "";
    const named = /'nonce-([^']+)'/.exec(policy)?.[1];

    expect(named).toBeTruthy();
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-nonce");
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(named);
  });

  it("still carries the policy on a redirect away from a guarded page", async () => {
    expect(await policyAt("/home", "visitor")).toContain("script-src");
    expect(await policyAt("/admin/dashboard", "member")).toContain("script-src");
  });
});

describe("a token of the wrong type is treated as absent", () => {
  async function landsWith(path: string, cookie: string): Promise<string> {
    const res = await proxy(new NextRequest(`http://localhost${path}`, { headers: { cookie } }));
    const location = res.headers.get("location");
    if (!location) return path;
    const url = new URL(location);
    return url.pathname;
  }

  it("sends a user token in the admin cookie to the admin login", async () => {
    const user = await sign({ typ: "user", userId: "u1", tokenVersion: 0 });
    expect(await landsWith("/admin/dashboard", `admin_token=${user}`)).toBe("/admin/login");
  });

  it("sends an admin token in the user cookie to the member login", async () => {
    const admin = await sign({ typ: "admin", adminId: "a1", username: "admin", tokenVersion: 0 });
    expect(await landsWith("/home", `user_token=${admin}`)).toBe("/login");
  });

  it("forces a token from before the claim existed to sign in again", async () => {
    const legacy = await sign({ userId: "u1", tokenVersion: 0 });
    expect(await landsWith("/home", `user_token=${legacy}`)).toBe("/login");
    const legacyAdmin = await sign({ adminId: "a1", username: "admin", tokenVersion: 0 });
    expect(await landsWith("/admin/dashboard", `admin_token=${legacyAdmin}`)).toBe("/admin/login");
  });

  it("never bounces a mistyped user token into the change-password loop", async () => {
    const admin = await sign({ typ: "admin", adminId: "a1", mustChangePassword: true });
    expect(await landsWith("/activities", `user_token=${admin}`)).toBe("/activities");
  });
});
