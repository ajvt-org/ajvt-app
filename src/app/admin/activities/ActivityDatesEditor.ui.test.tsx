import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityDatesEditor from "./ActivityDatesEditor";
import { activityDatesEditor as texts } from "@/lib/texts";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function activity(overrides: Partial<Parameters<typeof ActivityDatesEditor>[0]["activity"]> = {}) {
  return {
    id: "a1",
    period: null,
    startsAt: "2026-09-20T16:00:00.000Z",
    endsAt: "2026-09-22T18:00:00.000Z",
    withTime: true,
    ...overrides,
  };
}

const day = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const clears = () => screen.queryAllByRole("button", { name: texts.clearDate });

function show(overrides = {}) {
  patch.mockReset();
  patch.mockResolvedValue({});
  return {
    user: userEvent.setup(),
    ...render(<ActivityDatesEditor activity={activity(overrides)} onSaved={() => {}} />),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("taking a date off an activity", () => {
  it("empties the start date without touching the end", async () => {
    const { user } = show();

    await user.click(clears()[0]);

    expect(day(texts.from).value).toBe("");
    expect(day(texts.to).value).toBe("2026-09-22");
  });

  it("sends the start as null once the admin saves", async () => {
    const { user } = show();

    await user.click(clears()[0]);
    await user.click(screen.getByRole("button", { name: new RegExp(texts.save) }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({
      startsAt: null,
      endsAt: "2026-09-22T18:00:00.000Z",
    });
  });

  it("does not save on its own when a date is cleared", async () => {
    const { user } = show();

    await user.click(clears()[0]);

    expect(patch).not.toHaveBeenCalled();
  });

  it("leaves the start alone when the end is cleared", async () => {
    const { user } = show();

    await user.click(clears()[1]);
    await user.click(screen.getByRole("button", { name: new RegExp(texts.save) }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({
      startsAt: "2026-09-20T16:00:00.000Z",
      endsAt: null,
    });
    expect(day(texts.from).value).toBe("2026-09-20");
  });

  it("frees the end date from the start it could not go before", async () => {
    const { user } = show();

    expect(day(texts.to).min).toBe("2026-09-20");

    await user.click(clears()[0]);

    expect(day(texts.to).min).toBe("");
  });

  it("offers nothing to clear where no date is set", () => {
    show({ startsAt: null, endsAt: null, period: "24 - 29 أغسطس" });

    expect(clears()).toHaveLength(0);
    expect(screen.getByText(texts.legacyPeriod("24 - 29 أغسطس"))).toBeTruthy();
  });

  it("gives the period back once the date it replaced is taken off", async () => {
    const { user } = show({ endsAt: null, period: "24 - 29 أغسطس" });

    expect(screen.queryByText(texts.legacyPeriod("24 - 29 أغسطس"))).toBeNull();

    await user.click(clears()[0]);

    expect(screen.getByText(texts.legacyPeriod("24 - 29 أغسطس"))).toBeTruthy();
  });
});
