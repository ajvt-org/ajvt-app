import { describe, it, expect, beforeEach } from "vitest";
import { GET as ADMINS } from "@/app/api/admin/admins/route";
import { GET as ME } from "@/app/api/user/me/route";
import { signToken } from "@/lib/auth";
import { resetDb, createUser, createAdmin } from "./helpers";
import { setCookie } from "./cookieJar";

describe("a token in the wrong cookie", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("gets a clean 401 from admin routes when it is a user token", async () => {
    const user = await createUser("22334455");
    const token = await signToken({
      typ: "user",
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });
    setCookie("admin_token", token);

    expect((await ADMINS()).status).toBe(401);
  });

  it("gets a clean 401 from member routes when it is an admin token", async () => {
    const admin = await createAdmin("boss", "SUPER");
    const token = await signToken({
      typ: "admin",
      adminId: admin.id,
      username: admin.username,
      tokenVersion: admin.tokenVersion,
    });
    setCookie("user_token", token);

    expect((await ME()).status).toBe(401);
  });

  it("no longer honours a token signed without the claim", async () => {
    const user = await createUser("22334455");
    setCookie("user_token", await signToken({ userId: user.id, tokenVersion: user.tokenVersion }));

    expect((await ME()).status).toBe(401);
  });
});
