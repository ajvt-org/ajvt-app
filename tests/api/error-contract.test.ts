import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/user/me/route";
import { resetDb } from "./helpers";

describe("the 401 contract", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("answers 401 with the same body the hand-written checks used to return", async () => {
    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "غير مصرح" });
  });
});
