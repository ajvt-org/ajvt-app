import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditRecordButton from "./EditRecordButton";
import { SAFE } from "./verbTones";

function toneOf(button: HTMLElement) {
  return {
    background: button.style.background,
    color: button.style.color,
  };
}

describe("the button that opens an edit form", () => {
  it("carries the tone of a tool rather than a decision", () => {
    render(<EditRecordButton label="تعديل" onClick={vi.fn()} />);

    expect(toneOf(screen.getByRole("button", { name: "تعديل" }))).toEqual(SAFE);
  });

  it("looks the same whichever screen asks for it", () => {
    const { unmount } = render(<EditRecordButton label="تعديل الدفعة" onClick={vi.fn()} />);
    const onPayment = toneOf(screen.getByRole("button", { name: "تعديل الدفعة" }));
    unmount();

    render(<EditRecordButton label="تعديل الدعم" onClick={vi.fn()} />);

    expect(toneOf(screen.getByRole("button", { name: "تعديل الدعم" }))).toEqual(onPayment);
  });

  it("becomes the way out of the form it opened, without changing tone", () => {
    render(<EditRecordButton label="تعديل" closeLabel="إلغاء" open onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "إلغاء" });
    expect(toneOf(button)).toEqual(SAFE);
    expect(screen.queryByRole("button", { name: "تعديل" })).toBeNull();
  });

  it("stays the pencil where no way out was offered", () => {
    render(<EditRecordButton label="تعديل" open onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "تعديل" })).toBeTruthy();
  });

  it("presses once and refuses while busy", async () => {
    const onClick = vi.fn();
    const { unmount } = render(<EditRecordButton label="تعديل" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "تعديل" }));
    unmount();

    render(<EditRecordButton label="تعديل" disabled onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "تعديل" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
