import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/auth/register/route";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as ADMIN_CHANGE } from "@/app/api/admin/change-password/route";
import { POST as MEMBER_CHANGE } from "@/app/api/user/password/route";
import { resetDb, post, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";
import { clearAttempts } from "@/lib/rateLimit";
import { HOME_VILLAGE } from "@/lib/villages";

const TOO_SHORT = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";

const person = { fullName: "محمد ولد أحمد", village: HOME_VILLAGE, age: "البدريين" };

describe("the eight character password floor", () => {
  beforeEach(async () => {
    await resetDb();
    clearAttempts("register:unknown");
  });

  it("refuses a seven character password at registration and says why", async () => {
    const res = await REGISTER(
      post("/api/auth/register", { phone: "22334455", password: "1234567", ...person }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(TOO_SHORT);
  });

  it("accepts eight characters at registration", async () => {
    const res = await REGISTER(
      post("/api/auth/register", { phone: "22334455", password: "12345678", ...person }),
    );

    expect(res.status).toBe(201);
  });

  it("refuses seven characters at member change-password", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    const res = await MEMBER_CHANGE(
      post("/api/user/password", { currentPassword: "secret", newPassword: "1234567" }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(TOO_SHORT);
  });

  it("refuses seven characters at admin change-password", async () => {
    await signInAsAdmin(await createAdmin("boss", "SUPER", "secret"));

    const res = await ADMIN_CHANGE(
      post("/api/admin/change-password", { currentPassword: "secret", newPassword: "1234567" }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(TOO_SHORT);
  });

  it("still signs in an account whose stored password predates the floor", async () => {
    await createUser("22334455", "secret");

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "secret" }));

    expect(res.status).toBe(200);
  });

  it("keeps rejecting a taken phone with a conflict", async () => {
    await createUser("22334455", "secret");

    const res = await REGISTER(
      post("/api/auth/register", { phone: "22334455", password: "12345678", ...person }),
    );

    expect(res.status).toBe(409);
  });
});
