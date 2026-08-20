import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import * as bcrypt from "bcryptjs";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as ADMIN_LOGIN } from "@/app/api/admin/login/route";
import { clearAttempts } from "@/lib/rateLimit";
import { resetDb, post, createUser, createAdmin } from "./helpers";

vi.mock("bcryptjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bcryptjs")>();
  return { ...actual, compare: vi.fn(actual.compare) };
});

const compare = bcrypt.compare as unknown as Mock;

describe("the login miss path does the same work as a wrong password", () => {
  beforeEach(async () => {
    await resetDb();
    clearAttempts("login-ip:unknown");
    clearAttempts("admin-login-ip:unknown");
    compare.mockClear();
  });

  it("compares against a dummy hash when the phone is unknown", async () => {
    const res = await LOGIN(post("/api/auth/login", { phone: "49990000", password: "guess-123" }));

    expect(res.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(1);
  }, 15_000);

  it("compares once for a known phone with a wrong password, same as a miss", async () => {
    await createUser("22334455", "secret");

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "wrong" }));

    expect(res.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it("compares against a dummy hash when the admin username is unknown", async () => {
    await createAdmin("boss", "SUPER", "secret12");

    const miss = await ADMIN_LOGIN(
      post("/api/admin/login", { username: "nobody", password: "guess-123" }),
    );
    expect(miss.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(1);

    const wrong = await ADMIN_LOGIN(
      post("/api/admin/login", { username: "boss", password: "guess-123" }),
    );
    expect(wrong.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(2);
  }, 15_000);
});
