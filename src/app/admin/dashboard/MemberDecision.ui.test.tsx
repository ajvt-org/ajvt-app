import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { reviewQueue as texts } from "@/lib/texts";
import MemberDecision from "./MemberDecision";
import type { Member } from "./types";

function show(status: Member["status"], showRejectPicker = false) {
  cleanup();
  render(
    <MemberDecision
      member={{ id: "m1", status, rejectionReason: null } as Member}
      loading={false}
      showRejectPicker={showRejectPicker}
      rejectReason=""
      onRejectReason={vi.fn()}
      onOpenRejectPicker={vi.fn()}
      onCloseRejectPicker={vi.fn()}
      onApprove={vi.fn()}
      onReject={vi.fn()}
    />,
  );
}

describe("the shortcuts on the review queue", () => {
  it("puts no letter on the buttons the shortcuts fire", () => {
    show("PENDING");

    expect(document.querySelectorAll("kbd")).toHaveLength(0);
  });

  it("leaves the accept and reject buttons answering to their own names", () => {
    show("PENDING");

    expect(screen.getByRole("button", { name: texts.accept })).toBeTruthy();
    expect(screen.getByRole("button", { name: texts.reject })).toBeTruthy();
  });

  it("carries no legend above the buttons", () => {
    show("PENDING");

    expect(screen.queryByText(/اختصارات/)).toBeNull();
  });

  it("keeps the letter off a button the shortcut does not fire", () => {
    show("REJECTED");

    expect(screen.getByText(texts.markAccepted).closest("button")?.querySelector("kbd")).toBeNull();
  });

  it("leaves the digits to the numbered options rather than the reason label", () => {
    show("PENDING", true);

    expect(screen.getByText(texts.rejectReasonLabel).textContent).toBe(texts.rejectReasonLabel);
    expect(screen.getByRole("option", { name: /^1\./ })).toBeTruthy();
  });
});
