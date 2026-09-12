import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import BlockTimer from "./BlockTimer";

const OPEN = new Date("2026-09-01T10:00:00Z");
const CLOSE = new Date("2026-09-08T10:00:00Z");
const LABEL = "الوقت المتبقي في الكتلة";

const bar = () => screen.getByRole("progressbar");
const fill = () => (bar().firstElementChild as HTMLElement).style.width;
const announced = () => bar().getAttribute("aria-valuenow");
const fillTone = () => (bar().firstElementChild as HTMLElement).style.background;
const trackTone = () => bar().style.background;
const at = (share: number) => new Date(OPEN.getTime() + (CLOSE.getTime() - OPEN.getTime()) * share);

const timer = (opensAt: Date, closesAt: Date, onReached?: () => void) => (
  <BlockTimer
    opensAt={opensAt.toISOString()}
    closesAt={closesAt.toISOString()}
    label={LABEL}
    onReached={onReached}
  />
);

const setup = (now: Date) => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  render(timer(OPEN, CLOSE));
};

describe("BlockTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fills the whole bar and announces all of the time at block open", () => {
    setup(OPEN);

    expect(fill()).toBe("100%");
    expect(announced()).toBe("100");
  });

  it("fills half the bar and announces half the time at the midpoint", () => {
    setup(at(0.5));

    expect(fill()).toBe("50%");
    expect(announced()).toBe("50");
  });

  it("drains the bar as the block runs down", () => {
    setup(at(0.25));

    expect(fill()).toBe("75%");
    expect(announced()).toBe("75");
  });

  it("empties the bar and announces none of the time when the block has closed", () => {
    setup(CLOSE);

    expect(fill()).toBe("0%");
    expect(announced()).toBe("0");
  });

  it("keeps a track behind the bar once the block has drained", () => {
    setup(CLOSE);

    expect(fill()).toBe("0%");
    expect(trackTone()).toBe("var(--mint-100)");
  });

  it("names the bar for a reader who cannot see it", () => {
    setup(at(0.5));

    expect(bar().getAttribute("aria-label")).toBe(LABEL);
  });

  it("keeps the bar mint while most of the block is left", () => {
    setup(at(0.5));

    expect(fillTone()).toContain("mint");
  });

  it("turns the bar copper once the block is nearly over", () => {
    setup(at(0.9));

    expect(fillTone()).toContain("copper");
  });

  it("calls onReached once when the block closes and not again on later ticks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(CLOSE.getTime() - 30_000));
    const onReached = vi.fn();
    render(timer(OPEN, CLOSE, onReached));

    expect(onReached).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledOnce();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onReached).toHaveBeenCalledOnce();
  });

  it("fires again when the next block closes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(CLOSE.getTime() - 30_000));
    const onReached = vi.fn();
    const { rerender } = render(timer(OPEN, CLOSE, onReached));

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledOnce();

    const nextClose = new Date(CLOSE.getTime() + (CLOSE.getTime() - OPEN.getTime()));
    vi.setSystemTime(new Date(nextClose.getTime() - 30_000));
    rerender(timer(CLOSE, nextClose, onReached));

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledTimes(2);
  });
});
