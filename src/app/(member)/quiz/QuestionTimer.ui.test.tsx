import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import QuestionTimer from "./QuestionTimer";

const curve = { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 };
const NOW = new Date("2026-08-20T09:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const at = (secondsAgo: number) => new Date(NOW.getTime() - secondsAgo * 1000).toISOString();

describe("QuestionTimer", () => {
  it("starts on the whole question and its whole time", () => {
    render(<QuestionTimer shownAt={at(0)} curve={curve} />);

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("100%");
    expect(screen.getByLabelText("الوقت المتبقي").textContent).toContain("30");
  });

  it("still pays everything inside the full points window", () => {
    render(<QuestionTimer shownAt={at(9)} curve={curve} />);

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("100%");
  });

  it("falls once the window has passed", () => {
    render(<QuestionTimer shownAt={at(20)} curve={curve} />);

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("75%");
  });

  it("rests on the floor when the time is up", () => {
    render(<QuestionTimer shownAt={at(45)} curve={curve} />);

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("50%");
    expect(screen.getByLabelText("الوقت المتبقي").textContent).toContain("0");
  });

  it("keeps counting as the seconds pass", () => {
    render(<QuestionTimer shownAt={at(0)} curve={curve} />);

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("75%");
  });

  it("says the time is up as soon as it runs out", () => {
    const onExpire = vi.fn();
    render(<QuestionTimer shownAt={at(0)} curve={curve} onExpire={onExpire} />);

    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("says it only once however long it waits", () => {
    const onExpire = vi.fn();
    render(<QuestionTimer shownAt={at(0)} curve={curve} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("says it at once for a question that was already over", () => {
    const onExpire = vi.fn();
    render(<QuestionTimer shownAt={at(45)} curve={curve} onExpire={onExpire} />);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("counts from the moment it appears when nothing was stamped", () => {
    render(<QuestionTimer shownAt="" curve={curve} />);

    expect(screen.getByLabelText("نسبة النقاط").textContent).toContain("100%");
  });
});
