import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { uploads, tournament, common } from "@/lib/messages";
import { resetDb, post, createUser, signInAs } from "./helpers";

import { POST as USER_LOGOUT } from "@/app/api/auth/logout/route";
import { POST as ADMIN_LOGOUT } from "@/app/api/admin/logout/route";
import { GET as VERIFY } from "@/app/api/verify/[memberNumber]/route";
import { GET as FOLLOW, POST as SET_FOLLOW } from "@/app/api/teams/[teamId]/follow/route";
import { POST as UPLOAD } from "@/app/api/upload/route";

const withTeamId = (teamId: string) => ({ params: Promise.resolve({ teamId }) });

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

function upload(fields: { type?: string; size?: number } = {}) {
  const bytes = new Uint8Array(fields.size ?? 3);
  const file = new File([bytes], "p.png", { type: fields.type ?? "image/png" });
  const form = new FormData();
  form.append("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: form,
    headers: { origin: "http://localhost" },
  }) as never;
}

describe("the routes moved onto withRoute", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("clears the member cookie on logout", async () => {
    const res = await USER_LOGOUT();

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("user_token=");
  });

  it("clears the admin cookie on logout", async () => {
    const res = await ADMIN_LOGOUT();

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("admin_token=");
  });

  it("still answers a retired card check with 410 and its message", async () => {
    const res = await VERIFY();

    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ valid: false, message: "هذا المسار غير متاح" });
  });

  it("tells a visitor they are not signed in rather than refusing them", async () => {
    const res = await FOLLOW(undefined as never, withTeamId("whatever"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ following: false, loggedIn: false });
  });

  it("reports whether a signed-in member follows the team", async () => {
    const user = await createUser();
    await signInAs(user);
    const activity = await prisma.activity.create({
      data: { title: "بطولة", description: "وصف" },
    });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "الفريق" } });

    const before = await FOLLOW(undefined as never, withTeamId(team.id));
    expect(await before.json()).toEqual({ following: false, loggedIn: true });

    await SET_FOLLOW(post(`/api/teams/${team.id}/follow`, {}), withTeamId(team.id));

    const after = await FOLLOW(undefined as never, withTeamId(team.id));
    expect(await after.json()).toEqual({ following: true, loggedIn: true });
  });

  it("answers a follow on a team that does not exist with the typed 404", async () => {
    await signInAs(await createUser());

    const res = await SET_FOLLOW(post("/api/teams/nope/follow", {}), withTeamId("nope"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: tournament.teamNotFound });
  });

  it("refuses an upload from nobody", async () => {
    const res = await UPLOAD(upload());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: common.unauthorized });
  });

  it("refuses a file type it will not process", async () => {
    await signInAs(await createUser());

    const res = await UPLOAD(upload({ type: "application/pdf" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: uploads.unsupportedType });
  });

  it("refuses a file past the size limit", async () => {
    await signInAs(await createUser());

    const res = await UPLOAD(upload({ size: 11 * 1024 * 1024 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: uploads.tooLarge });
  });

  it("accepts an image from a signed-in member and fingerprints it", async () => {
    await signInAs(await createUser());

    const res = await UPLOAD(upload());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.filename).toMatch(/\.webp$/);
    expect(await prisma.proofImage.count()).toBe(1);
  });
});
