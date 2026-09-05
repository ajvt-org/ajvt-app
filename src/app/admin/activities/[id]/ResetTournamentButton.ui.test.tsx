import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetTournamentButton, { deletionLines } from "./ResetTournamentButton";
import { counted } from "@/lib/arabicCount";
import { DAY, GROUP, MATCH, RESULT, SUSPENSION } from "@/lib/messages";
import { resetTournament as texts } from "@/lib/texts";

const get = vi.fn();
const post = vi.fn();
const toast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => toast }));

const FULL = { matches: 24, results: 12, groups: 2, days: 6, suspensions: 1 };
const EMPTY = { matches: 0, results: 0, groups: 0, days: 0, suspensions: 0 };

const onReset = vi.fn();
const show = () => render(<ResetTournamentButton activityId="a1" onReset={onReset} />);

async function openConfirm(counts = FULL) {
  get.mockResolvedValue(counts);
  show();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(texts.action) }));
  await screen.findByText(texts.staysHeading);
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  toast.mockReset();
  onReset.mockReset();
  post.mockResolvedValue({});
});

describe("deletionLines", () => {
  it("names every count the reset will delete", () => {
    expect(deletionLines(FULL)).toEqual([
      counted(24, MATCH),
      counted(12, RESULT),
      counted(2, GROUP),
      counted(6, DAY),
      counted(1, SUSPENSION),
    ]);
  });

  it("leaves out anything there is none of", () => {
    expect(deletionLines({ ...EMPTY, matches: 3 })).toEqual([counted(3, MATCH)]);
  });

  it("names nothing on a tournament already at its teams", () => {
    expect(deletionLines(EMPTY)).toEqual([]);
  });
});

describe("the reset card", () => {
  it("deletes nothing before the admin has confirmed", async () => {
    await openConfirm();

    expect(post).not.toHaveBeenCalled();
  });

  it("names the counts it is about to delete", async () => {
    await openConfirm();

    for (const line of deletionLines(FULL)) {
      expect(screen.getByText(line)).toBeDefined();
    }
  });

  it("says what survives the reset", async () => {
    await openConfirm();

    expect(screen.getByText(texts.stays)).toBeDefined();
  });

  it("says so when there is nothing left to delete", async () => {
    await openConfirm(EMPTY);

    expect(screen.getByText(texts.alreadyClear)).toBeDefined();
  });

  it("reads the counts fresh rather than trusting an older screen", async () => {
    await openConfirm();

    expect(get).toHaveBeenCalledWith("/api/admin/activities/a1/tournament-reset");
  });

  it("resets and tells the page once the admin confirms", async () => {
    await openConfirm();

    fireEvent.click(screen.getByRole("button", { name: texts.confirmLabel }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/admin/activities/a1/tournament-reset");
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(texts.done);
  });

  it("keeps the tournament when the admin backs out", async () => {
    await openConfirm();

    fireEvent.click(screen.getByRole("button", { name: "إلغاء" }));

    await waitFor(() => expect(screen.queryByText(texts.staysHeading)).toBeNull());
    expect(post).not.toHaveBeenCalled();
  });

  it("says so when the counts cannot be read, and opens nothing", async () => {
    get.mockRejectedValue(new Error("فشل"));
    show();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(texts.action) }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith("فشل", "error"));
    expect(screen.queryByText(texts.staysHeading)).toBeNull();
  });
});
