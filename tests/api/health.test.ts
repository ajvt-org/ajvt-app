import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as HEALTH } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers that it is well when the database replies", async () => {
    const res = await HEALTH();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("answers 503 when the database does not", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await HEALTH();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("says nothing about why, since the route has no authentication", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("password authentication failed"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const body = await (await HEALTH()).text();

    expect(body).not.toContain("password");
    expect(Object.keys(JSON.parse(body))).toEqual(["ok"]);
  });
});
