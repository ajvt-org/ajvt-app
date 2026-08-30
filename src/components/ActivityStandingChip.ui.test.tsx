import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ActivityStandingChip from "./ActivityStandingChip";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);

afterEach(cleanup);

describe("ActivityStandingChip", () => {
  it("counts down to a coming activity", () => {
    render(<ActivityStandingChip startsAt={day(3)} endsAt={day(5)} />);

    expect(screen.getByText(/يبدأ بعد 3 أيام/)).toBeDefined();
  });

  it("says tomorrow for one day out", () => {
    render(<ActivityStandingChip startsAt={day(1)} />);

    expect(screen.getByText("يبدأ غداً")).toBeDefined();
  });

  it("pulses on a running activity", () => {
    const { container } = render(<ActivityStandingChip startsAt={day(-1)} endsAt={day(2)} />);

    expect(screen.getByText("جارٍ الآن")).toBeDefined();
    expect(container.querySelector(".live-dot")).not.toBeNull();
  });

  it("closes a finished activity quietly", () => {
    render(<ActivityStandingChip startsAt={day(-9)} endsAt={day(-2)} />);

    expect(screen.getByText("انتهى")).toBeDefined();
  });

  it("renders nothing without dates", () => {
    const { container } = render(<ActivityStandingChip startsAt={null} />);

    expect(container.innerHTML).toBe("");
  });

  it("shows the unscheduled badge without dates when the caller asks for it", () => {
    render(<ActivityStandingChip startsAt={null} showUnscheduled />);

    expect(screen.getByText("غير مبرمج بعد")).toBeDefined();
  });

  it("says matches remain when the dates ran out but a match did not", () => {
    render(<ActivityStandingChip startsAt={day(-6)} endsAt={day(-1)} unplayedMatches={2} />);

    expect(screen.getByText("بقيت مباراتان")).toBeDefined();
    expect(screen.queryByText("انتهى")).toBeNull();
  });

  it("finishes once nothing is left to play", () => {
    render(<ActivityStandingChip startsAt={day(-6)} endsAt={day(-1)} unplayedMatches={0} />);

    expect(screen.getByText("انتهى")).toBeDefined();
  });

  it("finishes an activity that has no matches at all", () => {
    render(<ActivityStandingChip startsAt={day(-6)} endsAt={day(-1)} />);

    expect(screen.getByText("انتهى")).toBeDefined();
  });

  it("counts one remaining match in the singular", () => {
    render(<ActivityStandingChip startsAt={day(-6)} endsAt={day(-1)} unplayedMatches={1} />);

    expect(screen.getByText("بقيت مباراة واحدة")).toBeDefined();
  });

  it("counts several remaining matches as a number", () => {
    render(<ActivityStandingChip startsAt={day(-6)} endsAt={day(-1)} unplayedMatches={3} />);

    expect(screen.getByText("بقيت 3 مباريات")).toBeDefined();
  });
});
