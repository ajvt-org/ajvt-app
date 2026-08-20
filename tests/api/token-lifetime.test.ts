import { describe, it, expect, beforeEach } from "vitest";
import { decodeJwt } from "jose";
import { POST as ADMIN_LOGIN } from "@/app/api/admin/login/route";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { resetDb, post, createUser, createAdmin } from "./helpers";
import { clearAttempts } from "@/lib/rateLimit";

const HOUR = 60 * 60;

function lifetimeOf(token: string): number {
  const { exp, iat } = decodeJwt(token);
  return (exp as number) - (iat as number);
}

describe("token lifetimes", () => {
  beforeEach(async () => {
    await resetDb();
    clearAttempts("login-ip:unknown");
    clearAttempts("admin-login-ip:unknown");
  });

  it("gives an admin token the eight hours its cookie claims", async () => {
    await createAdmin("boss", "SUPER", "secret12");

    const res = await ADMIN_LOGIN(
      post("/api/admin/login", { username: "boss", password: "secret12" }),
    );

    expect(res.status).toBe(200);
    expect(lifetimeOf(res.cookies.get("admin_token")!.value)).toBe(8 * HOUR);
  });

  it("keeps a member token at thirty days", async () => {
    await createUser("22334455", "secret");

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "secret" }));

    expect(res.status).toBe(200);
    expect(lifetimeOf(res.cookies.get("user_token")!.value)).toBe(30 * 24 * HOUR);
  });
});
