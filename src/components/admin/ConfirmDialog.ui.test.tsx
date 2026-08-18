import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("shows the title and message it was given", () => {
    render(
      <ConfirmDialog
        title="حذف السؤال"
        message="هل أنت متأكد؟"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("حذف السؤال")).toBeDefined();
    expect(screen.getByText("هل أنت متأكد؟")).toBeDefined();
  });

  it("labels the confirm button تأكيد when none is given", () => {
    render(
      <ConfirmDialog title="t" message="m" onConfirm={() => {}} onClose={() => {}} />,
    );

    expect(screen.getByRole("button", { name: "تأكيد" })).toBeDefined();
  });

  it("uses a custom confirm label when given one", () => {
    render(
      <ConfirmDialog
        title="t"
        message="m"
        confirmLabel="حذف نهائي"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "حذف نهائي" })).toBeDefined();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog title="t" message="m" onConfirm={onConfirm} onClose={() => {}} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when إلغاء is clicked, without touching onConfirm", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog title="t" message="m" onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "إلغاء" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onClose from the header's close button too", () => {
    const onClose = vi.fn();
    render(<ConfirmDialog title="t" message="m" onConfirm={() => {}} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables the confirm button and shows a busy state while loading", () => {
    render(
      <ConfirmDialog title="t" message="m" loading onConfirm={() => {}} onClose={() => {}} />,
    );

    const button = screen.getByText("...").closest("button");
    expect(button?.disabled).toBe(true);
  });
});
