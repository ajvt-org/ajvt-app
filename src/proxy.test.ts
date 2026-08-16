import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { proxy, config } from "@/proxy";

// Where every route sends every kind of caller, as a table. The proxy has no
// database, so all it can tell apart is which cookie you carry: whether the
// account has a member attached is decided a layer down, in requireUser.
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
    `user_token=${await sign({ userId: "u1", tokenVersion: 0, mustChangePassword: false })}`,
  locked: async () =>
    `user_token=${await sign({ userId: "u1", tokenVersion: 0, mustChangePassword: true })}`,
  forged: async () => "user_token=not.a.real.token",
  admin: async () =>
    `admin_token=${await sign({ adminId: "a1", username: "admin", tokenVersion: 0 })}`,
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

// path -> where each state ends up. "self" means the request is left alone.
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

// The matcher decides which requests reach the proxy at all. It went from four
// named routes to everything-except, which is the change here with the widest
// blast radius: too greedy and the app stops serving its own assets.
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
    "/version-final.png",
    "/uploads/photo.webp",
  ])("leaves %s alone", (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});

// One service answers on two hostnames: the admin screens on theirs, the
// member app on the public one. Without ADMIN_HOST set, neither is separated
// and every case above still describes what happens.
describe("splitting the admin app onto its own hostname", () => {
  const ADMIN = "admin.ajvt.net";
  const PUBLIC = "ajvt.net";

  async function ask(host: string, path: string) {
    const res = await proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }));
    const location = res.headers.get("location");
    return {
      status: res.status,
      to: location ? new URL(location).pathname : null,
    };
  }

  describe("with no ADMIN_HOST, which is how it deploys until the domain exists", () => {
    it("still serves the admin area on the only host there is", async () => {
      expect((await ask(PUBLIC, "/admin/login")).status).toBe(200);
      expect((await ask(PUBLIC, "/api/admin/members")).status).toBe(200);
    });
  });

  describe("with ADMIN_HOST set", () => {
    beforeEach(() => {
      vi.stubEnv("ADMIN_HOST", ADMIN);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("has no admin area on the public host at all", async () => {
      expect((await ask(PUBLIC, "/admin")).status).toBe(404);
      expect((await ask(PUBLIC, "/admin/dashboard")).status).toBe(404);
      expect((await ask(PUBLIC, "/api/admin/members")).status).toBe(404);
    });

    it("leaves the member app on the public host untouched", async () => {
      expect((await ask(PUBLIC, "/")).status).toBe(200);
      expect((await ask(PUBLIC, "/activities")).status).toBe(200);
      expect((await ask(PUBLIC, "/api/leaderboard")).status).toBe(200);
    });

    it("serves the admin area on the admin host", async () => {
      expect((await ask(ADMIN, "/admin")).status).toBe(200);
      expect((await ask(ADMIN, "/admin/login")).status).toBe(200);
      expect((await ask(ADMIN, "/api/admin/members")).status).toBe(200);
    });

    // Photos, receipts and the age list are drawn by the admin screens and are
    // not under /api/admin.
    it.each(["/api/files/proof.webp", "/api/ages", "/api/upload"])(
      "keeps %s, which the admin screens need",
      async (path) => {
        expect((await ask(ADMIN, path)).status).toBe(200);
      },
    );

    it("sends anything else on the admin host back to the admin area", async () => {
      expect(await ask(ADMIN, "/")).toEqual({ status: 307, to: "/admin" });
      expect(await ask(ADMIN, "/home")).toEqual({ status: 307, to: "/admin" });
    });

    it("refuses a member API on the admin host rather than redirecting a fetch", async () => {
      expect((await ask(ADMIN, "/api/leaderboard")).status).toBe(404);
    });

    it("ignores the port and the casing of the host", async () => {
      expect((await ask(`${ADMIN}:443`, "/admin")).status).toBe(200);
      expect((await ask(ADMIN.toUpperCase(), "/admin")).status).toBe(200);
    });

    // /administrators is not under /admin, and a prefix test without a segment
    // boundary would have said it was.
    it("matches on whole segments", async () => {
      expect((await ask(PUBLIC, "/administrators")).status).toBe(200);
    });
  });
});
