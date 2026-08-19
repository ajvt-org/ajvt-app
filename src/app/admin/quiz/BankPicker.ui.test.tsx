import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BankPicker, { type BankRow } from "./BankPicker";

const banks: BankRow[] = [
  { id: "general", name: "البنك العام", _count: { questions: 274 } },
  { id: "b2", name: "بنك البدريين", _count: { questions: 12 } },
];

const setup = (over: Partial<Parameters<typeof BankPicker>[0]> = {}) => {
  const props = {
    banks,
    openId: "general",
    busy: false,
    error: "",
    onOpen: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(<BankPicker {...props} />);
  return props;
};

describe("BankPicker", () => {
  it("lists the banks with how many questions each holds", () => {
    setup();

    expect(screen.getByText("البنك العام")).toBeDefined();
    expect(screen.getByText(/274 سؤالاً/)).toBeDefined();
    expect(screen.getByText(/12 سؤالاً/)).toBeDefined();
  });

  it("opens the bank that was picked", async () => {
    const props = setup();

    await userEvent.click(screen.getByText("بنك البدريين"));

    expect(props.onOpen).toHaveBeenCalledWith("b2");
  });

  it("creates a bank from a name", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: /بنك جديد/ }));
    await userEvent.type(screen.getByLabelText("اسم البنك"), "بنك الشباب");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(props.onCreate).toHaveBeenCalledWith("بنك الشباب");
  });

  it("renames a bank from its row", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "تعديل بنك البدريين" }));
    await userEvent.clear(screen.getByLabelText("اسم البنك"));
    await userEvent.type(screen.getByLabelText("اسم البنك"), "بنك آخر");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(props.onRename).toHaveBeenCalledWith("b2", "بنك آخر");
  });

  it("asks before deleting a bank", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "حذف بنك البدريين" }));
    expect(props.onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(props.onDelete).toHaveBeenCalledWith("b2");
  });

  it("shows what the server refused", () => {
    setup({ error: "يوجد بنك بهذا الاسم" });

    expect(screen.getByText("يوجد بنك بهذا الاسم")).toBeDefined();
  });
});
