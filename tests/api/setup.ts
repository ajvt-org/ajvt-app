import { vi } from "vitest";

vi.mock("next/headers", async () => {
  const { cookieStore } = await import("./cookieJar");
  return { cookies: async () => cookieStore };
});
