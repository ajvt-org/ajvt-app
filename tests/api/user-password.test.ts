import { describe, it, expect, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { POST } from "@/app/api/user/password/route";
import { GET as ME } from "@/app/api/user/me/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs } from "./helpers";

async function change(current: string, next: string) {
  return POST(post("/api/user/password", { currentPassword: current, newPassword: next }));
}

describe("POST /api/user/password", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("replaces the stored hash when the current password is right", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    const res = await change("secret", "brandnew");

    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("brandnew", after.password)).toBe(true);
    expect(await bcrypt.compare("secret", after.password)).toBe(false);
  });

  it("refuses a wrong current password and leaves the old one working", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    const res = await change("wrong", "brandnew");

    expect(res.status).toBe(401);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("secret", after.password)).toBe(true);
  });

  it("refuses to set the same password again", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    expect((await change("secret", "secret")).status).toBe(400);
  });

  it("refuses a new password under three characters", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    expect((await change("secret", "ab")).status).toBe(400);
  });

  it("needs a session", async () => {
    await createUser("22334455", "secret");

    expect((await change("secret", "brandnew")).status).toBe(401);
  });

  it("kills every other session by raising tokenVersion", async () => {
    const user = await createUser("22334455", "secret");
    const before = user.tokenVersion;
    await signInAs(user);

    await change("secret", "brandnew");

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.tokenVersion).toBe(before + 1);
  });

  it("keeps this session alive, since the old cookie carries the old tokenVersion", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    const res = await change("secret", "brandnew");
    expect(res.cookies.get("user_token")?.value).toBeTruthy();
    expect(res.cookies.get("user_token")?.httpOnly).toBe(true);

    // The helper's cookie jar is what requireUser reads, so a session left on
    // the pre-change token is exactly the other device.
    expect((await ME()).status).toBe(401);
  });

  it("rate limits repeated guesses at the current password", async () => {
    const user = await createUser("22334455", "secret");
    await signInAs(user);

    for (let i = 0; i < 5; i++) await change("wrong", "brandnew");

    expect((await change("secret", "brandnew")).status).toBe(429);
  });
});
