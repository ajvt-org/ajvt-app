import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { reviewQueue as texts } from "@/lib/texts";
import MemberDecision from "./MemberDecision";
import { REVIEW_KEYS } from "./useReviewShortcuts";
import type { Member } from "./types";

function withPointer(fine: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: fine, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the shortcuts on the review queue", () => {
  it("puts the letters on the buttons that fire them", () => {
    withPointer(true);
    show("PENDING");

    const accept = screen.getByText(texts.accept).closest("button");
    const reject = screen.getByText(texts.reject).closest("button");

    expect(accept?.querySelector("kbd")?.textContent).toBe(REVIEW_KEYS.accept.toUpperCase());
    expect(reject?.querySelector("kbd")?.textContent).toBe(REVIEW_KEYS.reject.toUpperCase());
  });

  it("says nothing about a keyboard where there is no keyboard", () => {
    withPointer(false);
    show("PENDING");

    expect(document.querySelectorAll("kbd")).toHaveLength(0);
  });

  it("keeps the cap out of the name the button answers to", () => {
    withPointer(true);
    show("PENDING");

    expect(screen.getByRole("button", { name: texts.accept })).toBeTruthy();
    expect(screen.getByRole("button", { name: texts.reject })).toBeTruthy();
  });

  it("carries no legend above the buttons", () => {
    withPointer(true);
    show("PENDING");

    expect(screen.queryByText(/اختصارات/)).toBeNull();
  });

  it("keeps the letter off a button the shortcut does not fire", () => {
    withPointer(true);
    show("REJECTED");

    expect(screen.getByText(texts.markAccepted).closest("button")?.querySelector("kbd")).toBeNull();
  });

  it("leaves the digits to the numbered options rather than the reason label", () => {
    withPointer(true);
    show("PENDING", true);

    expect(screen.getByText(texts.rejectReasonLabel).textContent).toBe(texts.rejectReasonLabel);
    expect(screen.getByRole("option", { name: /^1\./ })).toBeTruthy();
  });
});
