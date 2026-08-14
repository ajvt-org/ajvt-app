import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { resetDb, post, createUser } from "./helpers";

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await resetDb();
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
});
