import { describe, it, expect, vi } from "vitest";
import { goAfterAuthChange } from "./authNav";

function router() {
  const calls: string[] = [];
  return {
    calls,
    push: vi.fn((href: string) => calls.push(`push:${href}`)),
    refresh: vi.fn(() => calls.push("refresh")),
  };
}

describe("navigating after signing in or out", () => {
  it("drops the cached layouts as well as changing the page", () => {
    const r = router();

    goAfterAuthChange(r as never, "/home");

    expect(r.push).toHaveBeenCalledWith("/home");
    expect(r.refresh).toHaveBeenCalled();
  });

  // Without the refresh the bar keeps a visitor's tabs after signing in, and
  // only a manual reload clears it.
  it("refreshes after the navigation, not before it", () => {
    const r = router();

    goAfterAuthChange(r as never, "/");

    expect(r.calls).toEqual(["push:/", "refresh"]);
  });
});
