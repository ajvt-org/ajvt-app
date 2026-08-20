import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { clearAttempts } from "@/lib/rateLimit";
import { resetDb, post, createUser } from "./helpers";

function postFrom(ip: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await resetDb();
    clearAttempts("login-ip:unknown");
    clearAttempts("login:22334455");
  });

  it("signs in a known user and sets the session cookie", async () => {
    await createUser("22334455", "secret");

    const res = await POST(post("/api/auth/login", { phone: "22334455", password: "secret" }));

    expect(res.status).toBe(200);
    const cookie = res.cookies.get("user_token");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("rejects a wrong password without saying which field was wrong", async () => {
    await createUser("22334455", "secret");

    const res = await POST(post("/api/auth/login", { phone: "22334455", password: "wrong" }));

    expect(res.status).toBe(401);
    expect(res.cookies.get("user_token")).toBeUndefined();
  });

  it("gives the same answer for an unknown phone as for a wrong password", async () => {
    await createUser("22334455", "secret");

    const unknown = await POST(post("/api/auth/login", { phone: "49999999", password: "secret" }));
    const wrong = await POST(post("/api/auth/login", { phone: "22334455", password: "nope" }));

    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
  });

  it("requires both fields", async () => {
    expect((await POST(post("/api/auth/login", { phone: "22334455" }))).status).toBe(400);
    expect((await POST(post("/api/auth/login", { password: "secret" }))).status).toBe(400);
  });

  it("rate limits after repeated failures on the same phone", async () => {
    await createUser("22334455", "secret");

    for (let i = 0; i < 5; i++) {
      await POST(post("/api/auth/login", { phone: "22334455", password: "wrong" }));
    }

    const res = await POST(post("/api/auth/login", { phone: "22334455", password: "secret" }));
    expect(res.status).toBe(429);
  });

  it("rate limits one IP spraying a password across many phones", async () => {
    const ip = "198.51.100.9";
    for (let i = 0; i < 30; i++) {
      const phone = `2${String(10000000 + i).slice(1)}`;
      const res = await POST(postFrom(ip, { phone, password: "guess-123" }));
      expect(res.status).toBe(401);
    }

    const res = await POST(postFrom(ip, { phone: "24445555", password: "guess-123" }));
    expect(res.status).toBe(429);
  }, 30_000);

  it("leaves other IPs alone when one is rate limited", async () => {
    await createUser("22334455", "secret");
    for (let i = 0; i < 30; i++) {
      await POST(
        postFrom("198.51.100.10", {
          phone: `3${String(20000000 + i).slice(1)}`,
          password: "x-123456",
        }),
      );
    }

    const res = await POST(postFrom("198.51.100.11", { phone: "22334455", password: "secret" }));
    expect(res.status).toBe(200);
  }, 30_000);

  it("clears the account bucket on success so honest retries keep working", async () => {
    await createUser("22334455", "secret");
    for (let i = 0; i < 4; i++) {
      await POST(post("/api/auth/login", { phone: "22334455", password: "wrong" }));
    }
    expect(
      (await POST(post("/api/auth/login", { phone: "22334455", password: "secret" }))).status,
    ).toBe(200);

    for (let i = 0; i < 4; i++) {
      await POST(post("/api/auth/login", { phone: "22334455", password: "wrong" }));
    }
    expect(
      (await POST(post("/api/auth/login", { phone: "22334455", password: "secret" }))).status,
    ).toBe(200);
  });
});
