import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { common } from "@/lib/messages";
import { resetDb, post, createUser, get } from "./helpers";

import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as QUIZ_SEND } from "@/app/api/admin/quiz/send/route";
import { GET as SETTINGS } from "@/app/api/settings/route";

const CREDENTIALS = { phone: "22334455", password: "secret" };

function from(origin: string | null, referer?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  if (referer) headers.referer = referer;
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(CREDENTIALS),
  });
}

describe("where a request says it came from", () => {
  beforeEach(async () => {
    await resetDb();
    await createUser(CREDENTIALS.phone, CREDENTIALS.password);
  });

  it("lets through a post from the site itself", async () => {
    const res = await LOGIN(post("/api/auth/login", CREDENTIALS));

    expect(res.status).toBe(200);
  });

  it("refuses a post from somewhere else", async () => {
    const res = await LOGIN(from("https://evil.example"));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: common.crossOrigin });
  });

  it("refuses a post that will not say where it came from", async () => {
    const res = await LOGIN(from(null));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: common.crossOrigin });
  });

  it("falls back to the referer when there is no origin", async () => {
    const res = await LOGIN(from(null, "http://localhost/login"));

    expect(res.status).toBe(200);
  });

  it("refuses a referer from somewhere else", async () => {
    const res = await LOGIN(from(null, "https://evil.example/login"));

    expect(res.status).toBe(403);
  });

  it("does not sign anyone in on a refused request", async () => {
    const res = await LOGIN(from("https://evil.example"));

    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("leaves reading alone, which carries no origin at all", async () => {
    const res = await SETTINGS(get("/api/settings"));

    expect(res.status).toBe(200);
  });

  it("checks a handler that never asked for the request", async () => {
    const res = await QUIZ_SEND(
      new NextRequest("http://localhost/api/admin/quiz/send", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: common.crossOrigin });
  });
});
