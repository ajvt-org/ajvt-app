import { vi } from "vitest";
import { claimDatabase } from "./claimDatabase";

process.env.DATABASE_URL = await claimDatabase(process.env.TEST_DATABASE_BASE_URL as string);

vi.mock("next/headers", async () => {
  const { cookieStore } = await import("./cookieJar");
  return { cookies: async () => cookieStore };
});
