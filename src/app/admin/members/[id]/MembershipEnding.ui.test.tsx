import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipEnding from "./MembershipEnding";
import { membershipEnding as texts, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";

const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    del: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const NAME = "محمد ولد أحمد";

function show(ended = false) {
  return render(
    <MembershipEnding
      memberId="u1"
      memberName={NAME}
      year={2026}
      ended={ended}
      onChanged={vi.fn()}
    />,
  );
}

async function openDialog() {
  show();
  await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.end) }));
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
});

describe("asking before a membership is ended", () => {
  it("asks over the page instead of inside the card", async () => {
    await openDialog();

    expect(screen.getByRole("heading", { name: new RegExp(texts.endTitle) })).toBeTruthy();
  });

  it("names the member and the year being ended", async () => {
    await openDialog();

    expect(screen.getByText(texts.endSubject(NAME, 2026))).toBeTruthy();
  });

  it("says what ending leaves the person with", async () => {
    await openDialog();

    expect(screen.getByText(texts.endMeaning)).toBeTruthy();
  });

  it("carries the reason picker inside the dialog", async () => {
    await openDialog();

    const select = screen.getByLabelText(texts.reasonLabel);
    expect(screen.getAllByRole("option")).toHaveLength(MEMBERSHIP_ENDING_REASONS.length);
    expect((select as HTMLSelectElement).value).toBe(MEMBERSHIP_ENDING_REASONS[0]);
  });

  it("leaves the membership alone when the dialog is cancelled", async () => {
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: "إلغاء" }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(texts.reasonLabel)).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.end) })).toBeTruthy();
  });

  it("ends the membership for the reason that was picked", async () => {
    await openDialog();

    await userEvent.selectOptions(
      screen.getByLabelText(texts.reasonLabel),
      MEMBERSHIP_ENDING_REASONS[2],
    );
    await userEvent.click(screen.getByRole("button", { name: texts.endConfirm }));

    expect(post).toHaveBeenCalledWith("/api/admin/members/u1/end-membership", {
      reason: MEMBERSHIP_ENDING_REASONS[2],
    });
  });

  it("offers nothing to end on a membership already ended", () => {
    show(true);

    expect(screen.queryByRole("button", { name: new RegExp(texts.end) })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.restore) })).toBeTruthy();
  });
});
