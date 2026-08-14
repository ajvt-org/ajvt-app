import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("logger", () => {
  it("writes one line of json in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("member.create.failed", new Error("boom"));

    const line = spy.mock.calls[0][0] as string;
    expect(line.split("\n")).toHaveLength(1);
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("error");
    expect(parsed.event).toBe("member.create.failed");
    expect(parsed.error).toEqual({ name: "Error", message: "boom" });
  });

  it("keeps development output readable", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("push.skipped");

    expect(spy.mock.calls[0][0]).toBe("[warn] push.skipped");
  });

  it("serialises an error rather than dropping it to {}", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("x", new TypeError("bad input"));

    expect(JSON.parse(spy.mock.calls[0][0] as string).error).toEqual({
      name: "TypeError",
      message: "bad input",
    });
  });

  it("does not include a stack, which can carry request data", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("x", new Error("boom"));

    expect(spy.mock.calls[0][0]).not.toContain("stack");
    expect(spy.mock.calls[0][0]).not.toContain("at ");
  });

  it("accepts no detail at all", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("settings.updated");

    expect(JSON.parse(spy.mock.calls[0][0] as string).error).toBeNull();
  });
});
