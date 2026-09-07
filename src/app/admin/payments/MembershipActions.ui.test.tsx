import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipActions from "./MembershipActions";

vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), put: vi.fn(), del: vi.fn() },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/ProofUpload", () => ({
  default: () => <div data-testid="upload" />,
}));

function draw(status = "PENDING") {
  render(
    <MembershipActions
      userId="u1"
      memberName="Fatimetou"
      proof={null}
      status={status}
      onChanged={vi.fn()}
    />,
  );
}

function group(name: RegExp) {
  return screen.getByRole("button", { name }).parentElement!;
}

describe("the actions under a membership payment", () => {
  it("opens the proof panel outside the bar rather than inside it", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    const bar = group(/^قبول الدفع$/).parentElement!;
    expect(bar.contains(screen.getByTestId("upload"))).toBe(false);
  });

  it("keeps the bar on one line while the proof panel is open", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    expect(group(/^قبول الدفع$/).parentElement!.className).not.toContain("flex-wrap");
  });

  it("leaves every verdict reachable while a proof is being attached", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    expect(screen.getByRole("button", { name: /رفض إثبات الدفع/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /حذف الدفع نهائياً/ })).toBeTruthy();
  });

  it("keeps refusing a pending proof beside accepting it", () => {
    draw();

    const routine = group(/^قبول الدفع$/);
    expect(routine.contains(screen.getByRole("button", { name: /رفض إثبات الدفع/ }))).toBe(true);
    expect(routine.contains(screen.getByRole("button", { name: /حذف الدفع نهائياً/ }))).toBe(false);
  });

  it("offers no refusal once a payment has been accepted", () => {
    draw("ACTIVE");

    expect(screen.queryByRole("button", { name: /رفض إثبات الدفع/ })).toBeNull();
  });

  it("puts undoing an acceptance at the destructive end", () => {
    draw("ACTIVE");

    const destructive = group(/إبطال قبول الدفع/);
    expect(destructive.contains(screen.getByRole("button", { name: /حذف الدفع نهائياً/ }))).toBe(
      true,
    );
    expect(
      destructive.contains(screen.getByRole("button", { name: /استبدال الإثبات|إضافة إثبات/ })),
    ).toBe(false);
  });

  it("asks why before it undoes an acceptance", async () => {
    draw("ACTIVE");

    await userEvent.click(screen.getByRole("button", { name: /إبطال قبول الدفع/ }));

    expect(screen.getByText(/سبب إبطال قبول الدفع/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /تأكيد الإبطال/ })).toBeTruthy();
  });

  it("replaces the whole bar while a refusal is being decided", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /رفض إثبات الدفع/ }));

    expect(screen.queryByRole("button", { name: /^قبول الدفع$/ })).toBeNull();
  });
});
