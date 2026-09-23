import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ElectionClock from "./ElectionClock";

const START = new Date("2026-10-01T08:00:00Z");
const quarter = { startsAt: START.toISOString(), durationMinutes: 15 };
const after = (seconds: number) => START.getTime() + seconds * 1000;

const digits = () => screen.getByLabelText("الوقت المتبقي لانتهاء التصويت");

describe("the election countdown", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("stays mint while more than a tenth of the window is left", () => {
    vi.useFakeTimers();
    vi.setSystemTime(after(60));
    render(<ElectionClock election={quarter} now={after(60)} />);

    expect(digits().style.color).toBe("var(--mint-700)");
  });

  it("turns copper in the last tenth of the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(after(820));
    render(<ElectionClock election={quarter} now={after(820)} />);

    expect(digits().style.color).toBe("var(--copper-600)");
  });

  it("turns copper on its own clock when nobody hands it one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(after(820));
    render(<ElectionClock election={quarter} compact />);

    expect(digits().style.color).toBe("var(--copper-600)");
  });
});
