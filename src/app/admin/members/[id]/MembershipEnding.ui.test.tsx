import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipEnding from "./MembershipEnding";
import { membershipEnding as texts, MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";

const post = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    del: (...args: unknown[]) => del(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const NAME = "محمد ولد أحمد";

const ENDING = {
  endedAt: "2026-09-01T00:00:00.000Z",
  endedReason: MEMBERSHIP_ENDING_REASONS[2],
  endedBy: "eminyous",
};

function show(ending: typeof ENDING | null = null) {
  return render(
    <MembershipEnding
      memberId="u1"
      memberName={NAME}
      year={2026}
      ending={ending}
      onChanged={vi.fn()}
    />,
  );
}

async function openDialog() {
  show();
  await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.end) }));
}

async function openRestore() {
  show(ENDING);
  await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.restore) }));
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
  del.mockReset();
  del.mockResolvedValue({});
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
    expect((select as HTMLSelectElement).value).toBe(MEMBERSHIP_ENDING_REASONS[0]);
    for (const reason of MEMBERSHIP_ENDING_REASONS) {
      expect(screen.getByRole("option", { name: reason })).toBeTruthy();
    }
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

  it("offers a written reason last, and asks for no box until it is picked", async () => {
    await openDialog();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(MEMBERSHIP_ENDING_REASONS.length + 1);
    expect(options[options.length - 1].textContent).toBe(texts.otherReason);
    expect(screen.queryByLabelText(texts.writtenLabel)).toBeNull();
  });

  it("asks the admin to write the reason when the list does not name it", async () => {
    await openDialog();

    await userEvent.selectOptions(screen.getByLabelText(texts.reasonLabel), texts.otherReason);

    expect(screen.getByLabelText(texts.writtenLabel)).toBeTruthy();
    expect(screen.getByRole("button", { name: texts.endConfirm }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("refuses to end on a written reason that says nothing", async () => {
    await openDialog();

    await userEvent.selectOptions(screen.getByLabelText(texts.reasonLabel), texts.otherReason);
    await userEvent.type(screen.getByLabelText(texts.writtenLabel), "   ");
    await userEvent.click(screen.getByRole("button", { name: texts.endConfirm }));

    expect(post).not.toHaveBeenCalled();
  });

  it("ends on the reason the admin wrote, exactly as written", async () => {
    await openDialog();

    await userEvent.selectOptions(screen.getByLabelText(texts.reasonLabel), texts.otherReason);
    await userEvent.type(screen.getByLabelText(texts.writtenLabel), "سبب لا تسميه القائمة");
    await userEvent.click(screen.getByRole("button", { name: texts.endConfirm }));

    expect(post).toHaveBeenCalledWith("/api/admin/members/u1/end-membership", {
      reason: "سبب لا تسميه القائمة",
    });
  });

  it("keeps a listed reason one tap, with no box", async () => {
    await openDialog();

    await userEvent.selectOptions(
      screen.getByLabelText(texts.reasonLabel),
      MEMBERSHIP_ENDING_REASONS[3],
    );

    expect(screen.queryByLabelText(texts.writtenLabel)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: texts.endConfirm }));

    expect(post).toHaveBeenCalledWith("/api/admin/members/u1/end-membership", {
      reason: MEMBERSHIP_ENDING_REASONS[3],
    });
  });

  it("offers nothing to end on a membership already ended", () => {
    show(ENDING);

    expect(screen.queryByRole("button", { name: new RegExp(texts.end) })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.restore) })).toBeTruthy();
  });
});

describe("asking before a membership is brought back", () => {
  it("sends nothing on the first press", async () => {
    await openRestore();

    expect(del).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: new RegExp(texts.restoreTitle) })).toBeTruthy();
  });

  it("names the member and the year being brought back", async () => {
    await openRestore();

    expect(screen.getByText(texts.restoreSubject(NAME, 2026))).toBeTruthy();
  });

  it("shows the ending it is about to undo", async () => {
    await openRestore();

    expect(screen.getByText(texts.restoreUndoes)).toBeTruthy();
    expect(screen.getByText(ENDING.endedReason)).toBeTruthy();
    expect(screen.getByText("2026/09/01")).toBeTruthy();
    expect(screen.getByText(ENDING.endedBy)).toBeTruthy();
  });

  it("leaves the membership ended when the dialog is cancelled", async () => {
    await openRestore();

    await userEvent.click(screen.getByRole("button", { name: texts.cancel }));

    expect(del).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: new RegExp(texts.restore) })).toBeTruthy();
  });

  it("brings the membership back once the dialog is confirmed", async () => {
    await openRestore();

    await userEvent.click(screen.getByRole("button", { name: texts.restoreConfirm }));

    expect(del).toHaveBeenCalledWith("/api/admin/members/u1/end-membership");
  });
});
