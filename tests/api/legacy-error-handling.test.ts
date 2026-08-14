import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/user/me/route";
import { resetDb } from "./helpers";

describe("routes still using the hand-written error check", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keeps answering 401, even though auth now throws a typed error", async () => {
    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "غير مصرح" });
  });
});
