import { describe, it, expect, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as CHANGE } from "@/app/api/user/password/route";
import { GET as ME } from "@/app/api/user/me/route";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import { resetDb, post, createUser, signInAs } from "./helpers";

const HOUR = 60 * 60 * 1000;

async function withTempPassword(password: string, expiresAt: Date) {
  const user = await createUser("22334455", password);
  return prisma.user.update({
    where: { id: user.id },
    data: { tempPasswordExpiresAt: expiresAt },
  });
}

describe("temporary passwords", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("signs in on a live temporary password and flags the token", async () => {
    await withTempPassword("12345678", new Date(Date.now() + HOUR));

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "12345678" }));

    expect(res.status).toBe(200);
    expect(res.cookies.get("user_token")?.value).toBeTruthy();
  });

  it("refuses a temporary password that has run out", async () => {
    await withTempPassword("12345678", new Date(Date.now() - HOUR));

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "12345678" }));

    expect(res.status).toBe(401);
    expect(res.cookies.get("user_token")).toBeUndefined();
    expect((await res.json()).error).toContain("انتهت صلاحية");
  });

  it("still answers a wrong password generically, expired or not", async () => {
    await withTempPassword("12345678", new Date(Date.now() - HOUR));

    const res = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "nope" }));

    expect((await res.json()).error).not.toContain("انتهت صلاحية");
  });

  it("locks the rest of the app while the password is temporary", async () => {
    const user = await withTempPassword("12345678", new Date(Date.now() + HOUR));
    await signInAs(user);

    expect((await ME()).status).toBe(403);
  });

  it("changes the password without being given the old one", async () => {
    const user = await withTempPassword("12345678", new Date(Date.now() + HOUR));
    await signInAs(user);

    const res = await CHANGE(post("/api/user/password", { newPassword: "chosenwell" }));

    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("chosenwell", after.password)).toBe(true);
  });

  it("clears the expiry, so the lock lifts", async () => {
    const user = await withTempPassword("12345678", new Date(Date.now() + HOUR));
    await signInAs(user);

    await CHANGE(post("/api/user/password", { newPassword: "chosenwell" }));

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.tempPasswordExpiresAt).toBeNull();
  });

  it("kills the temporary password once a real one is chosen", async () => {
    const user = await withTempPassword("12345678", new Date(Date.now() + HOUR));
    await signInAs(user);
    await CHANGE(post("/api/user/password", { newPassword: "chosenwell" }));

    const old = await LOGIN(post("/api/auth/login", { phone: "22334455", password: "12345678" }));
    const chosen = await LOGIN(
      post("/api/auth/login", { phone: "22334455", password: "chosenwell" }),
    );

    expect(old.status).toBe(401);
    expect(chosen.status).toBe(200);
  });

  it("refuses to keep the temporary password as the real one", async () => {
    const user = await withTempPassword("12345678", new Date(Date.now() + HOUR));
    await signInAs(user);

    expect((await CHANGE(post("/api/user/password", { newPassword: "12345678" }))).status).toBe(
      400,
    );
  });

  it("still demands the current password when nothing is temporary", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    const res = await CHANGE(post("/api/user/password", { newPassword: "chosenwell" }));

    expect(res.status).toBe(400);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("secret", after.password)).toBe(true);
  });
});

describe("a revoked session", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stops reading as signed in, so pages do not draw the member bar over it", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);
    expect(await getUserSession()).not.toBeNull();

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    expect(await getUserSession()).toBeNull();
  });
});
