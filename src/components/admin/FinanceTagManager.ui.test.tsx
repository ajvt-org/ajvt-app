import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinanceTagManager, { type FinanceTagRow } from "./FinanceTagManager";
import { confirmDialog, financeTags as texts } from "@/lib/texts";

const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { del: (...args: unknown[]) => del(...args), post: vi.fn(), patch: vi.fn() },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const tag = (over: Partial<FinanceTagRow> = {}): FinanceTagRow => ({
  id: "t1",
  name: "نقل",
  count: 0,
  total: 0,
  ...over,
});

function show(tags: FinanceTagRow[]) {
  render(<FinanceTagManager tags={tags} onChanged={vi.fn()} onClose={vi.fn()} />);
}

beforeEach(() => del.mockReset().mockResolvedValue({}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("deleting a finance tag", () => {
  it("asks through the app rather than through the browser", async () => {
    const asked = vi.fn();
    vi.stubGlobal("confirm", asked);
    show([tag()]);

    await userEvent.click(screen.getByLabelText(texts.deleteOf("نقل")));

    expect(asked).not.toHaveBeenCalled();
    expect(screen.getByText(texts.confirmDelete)).toBeTruthy();
    expect(del).not.toHaveBeenCalled();
  });

  it("says how many expenses lose the tag when it is in use", async () => {
    show([tag({ count: 3 })]);

    await userEvent.click(screen.getByLabelText(texts.deleteOf("نقل")));

    expect(screen.getByText(texts.confirmDeleteInUse(3))).toBeTruthy();
    expect(screen.queryByText(texts.confirmDelete)).toBeNull();
  });

  it("deletes it once the reader says so", async () => {
    show([tag()]);

    await userEvent.click(screen.getByLabelText(texts.deleteOf("نقل")));
    await userEvent.click(screen.getByRole("button", { name: texts.delete }));

    expect(del).toHaveBeenCalledWith("/api/admin/finance-tags/t1");
  });

  it("deletes nothing when the reader backs out", async () => {
    show([tag()]);

    await userEvent.click(screen.getByLabelText(texts.deleteOf("نقل")));
    await userEvent.click(screen.getByRole("button", { name: confirmDialog.cancel }));

    expect(del).not.toHaveBeenCalled();
    expect(screen.queryByText(texts.confirmDelete)).toBeNull();
  });
});
