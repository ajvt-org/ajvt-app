import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError, errorMessage } from "./api";

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("returns the parsed body on success", async () => {
    mockFetch(200, { members: [1, 2] });

    await expect(api.get("/api/members")).resolves.toEqual({ members: [1, 2] });
  });

  it("sends json with the right method and headers", async () => {
    const fetchMock = mockFetch(201, { id: "x" });

    await api.post("/api/members", { fullName: "محمد" });

    expect(fetchMock).toHaveBeenCalledWith("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "محمد" }),
    });
  });

  it("sends a delete without a body when none is given", async () => {
    const fetchMock = mockFetch(200, {});

    await api.del("/api/admin/teams/t1");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/teams/t1", { method: "DELETE" });
  });

  it("sends a delete body as json when one is given", async () => {
    const fetchMock = mockFetch(200, {});

    await api.del("/api/teams/t1/join", { userId: "u1" });

    expect(fetchMock).toHaveBeenCalledWith("/api/teams/t1/join", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });
  });

  it("throws the server's arabic message, not a generic one", async () => {
    mockFetch(400, { error: "الاسم الكامل مطلوب" });

    await expect(api.post("/api/members", {})).rejects.toThrow("الاسم الكامل مطلوب");
  });

  it("carries the status so callers can handle 401 themselves", async () => {
    mockFetch(401, { error: "غير مصرح" });

    const err: unknown = await api.get("/api/user/me").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });

  it("falls back to the shared message when the server sends no error field", async () => {
    mockFetch(500, {});

    await expect(api.del("/api/admin/donations/1")).rejects.toThrow("فشلت العملية");
  });

  it("falls back when the body is not json at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(api.get("/api/x")).rejects.toThrow("فشلت العملية");
  });

  it("reports a network failure instead of crashing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const err: unknown = await api.get("/api/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).message).toBe("تعذر الاتصال بالخادم");
  });
});

describe("errorMessage", () => {
  it("uses the error's own message", () => {
    expect(errorMessage(new ApiError("العضو غير موجود", 404))).toBe("العضو غير موجود");
  });

  it("falls back for anything that is not an Error", () => {
    expect(errorMessage("boom")).toBe("خطأ");
    expect(errorMessage(null)).toBe("خطأ");
    expect(errorMessage(undefined)).toBe("خطأ");
  });
});
