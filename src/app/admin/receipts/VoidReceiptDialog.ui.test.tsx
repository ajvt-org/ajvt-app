import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoidReceiptDialog from "./VoidReceiptDialog";
import { confirmDialog } from "@/lib/texts";
import { receiptAdmin as texts } from "@/lib/texts/receipt";

function show(loading = false) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <VoidReceiptDialog number={NUMBER} loading={loading} onConfirm={onConfirm} onClose={onClose} />,
  );
  return { onConfirm, onClose };
}

const NUMBER = "AJVT-2026-0007";

const confirmButton = () => screen.getByRole("button", { name: texts.voidConfirm });

afterEach(cleanup);

describe("voiding a receipt", () => {
  it("asks for the reason in a field the app draws", () => {
    show();

    expect(screen.getByLabelText(texts.voidReasonLabel)).toBeTruthy();
    expect(screen.getByText(texts.voidTitle)).toBeTruthy();
  });

  it("says what voiding does to the receipt", () => {
    show();

    expect(screen.getByText(texts.voidConsequence)).toBeTruthy();
  });

  it("names the receipt with its parts reading left to right", () => {
    show();

    const named = screen.getByText(NUMBER);
    expect(named.tagName).toBe("BDI");
    expect(named.getAttribute("dir")).toBe("ltr");
  });

  it("refuses to go through with no reason at all", () => {
    show();

    expect(confirmButton().hasAttribute("disabled")).toBe(true);
  });

  it("refuses a reason that is only spaces", async () => {
    show();

    await userEvent.type(screen.getByLabelText(texts.voidReasonLabel), "   ");

    expect(confirmButton().hasAttribute("disabled")).toBe(true);
  });

  it("hands over the reason once one is written", async () => {
    const { onConfirm } = show();

    await userEvent.type(screen.getByLabelText(texts.voidReasonLabel), "خطأ في المبلغ");
    await userEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith("خطأ في المبلغ");
  });

  it("trims what it hands over", async () => {
    const { onConfirm } = show();

    await userEvent.type(screen.getByLabelText(texts.voidReasonLabel), "  خطأ  ");
    await userEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith("خطأ");
  });

  it("voids nothing when the reader backs out", async () => {
    const { onConfirm, onClose } = show();

    await userEvent.click(screen.getByRole("button", { name: confirmDialog.cancel }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("stops a second press while the first is going through", async () => {
    const { onConfirm } = show(true);

    await userEvent.type(screen.getByLabelText(texts.voidReasonLabel), "خطأ");
    const busy = screen.getByRole("button", { name: "..." });

    expect(busy.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: texts.voidConfirm })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
