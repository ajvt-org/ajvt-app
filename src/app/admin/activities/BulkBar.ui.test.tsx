import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkBar from "./BulkBar";

const onClose = vi.fn();
const onDelete = vi.fn();
const onClear = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function show(count = 2, busy = false) {
  render(
    <BulkBar count={count} busy={busy} onClose={onClose} onDelete={onDelete} onClear={onClear} />,
  );
}

describe("the bar that appears once rows are picked", () => {
  it("stays out of the way while nothing is picked", () => {
    const { container } = render(
      <BulkBar count={0} busy={false} onClose={onClose} onDelete={onDelete} onClear={onClear} />,
    );

    expect(container.textContent).toBe("");
  });

  it("says how many are picked", () => {
    show(3);

    expect(screen.getByText("3 محدَّد")).toBeTruthy();
  });

  it("closes the registration on all of them at once", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: /إغلاق التسجيل/ }));

    expect(onClose).toHaveBeenCalled();
  });

  it("asks before deleting anything", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: /^حذف$/ }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/سيُحذف 2 نشاطاً نهائياً/)).toBeTruthy();
  });

  it("says what else goes with them", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: /^حذف$/ }));

    expect(screen.getByText(/تسجيلات الأعضاء وفرقها ومبارياتها/)).toBeTruthy();
  });

  it("deletes once the question is answered", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: /^حذف$/ }));
    await userEvent.click(screen.getByRole("button", { name: /حذف نهائي/ }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("gives up the selection when asked", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: "إلغاء التحديد" }));

    expect(onClear).toHaveBeenCalled();
  });

  it("takes nothing while it is working", () => {
    show(2, true);

    expect(screen.getByRole("button", { name: /إغلاق التسجيل/ })).toHaveProperty("disabled", true);
  });
});
