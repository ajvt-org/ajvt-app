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

function bar() {
  return screen.getByRole("button", { name: /قبول الدفع/ }).parentElement!.parentElement!;
}

describe("the actions under a membership payment", () => {
  it("opens the proof panel outside the bar rather than inside it", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    expect(bar().contains(screen.getByTestId("upload"))).toBe(false);
  });

  it("keeps the bar on one line while the proof panel is open", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    expect(bar().className).not.toContain("flex-wrap");
  });

  it("leaves every verdict reachable while a proof is being attached", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /إضافة إثبات الدفع/ }));

    expect(screen.getByRole("button", { name: /رفض إثبات الدفع/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /حذف الدفع نهائياً/ })).toBeTruthy();
  });

  it("replaces the whole bar while a refusal is being decided", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: /رفض إثبات الدفع/ }));

    expect(screen.queryByRole("button", { name: /قبول الدفع/ })).toBeNull();
  });
});
