import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoLockCard from "./PhotoLockCard";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...a: unknown[]) => patch(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({});
});

describe("PhotoLockCard", () => {
  it("says the member may change their picture and offers to stop it", () => {
    render(<PhotoLockCard memberId="m1" locked={false} onChanged={vi.fn()} />);

    expect(screen.getByText("العضو يستطيع تغيير صورته")).toBeTruthy();
    expect(screen.getByRole("button", { name: /منع تغيير الصورة/ })).toBeTruthy();
  });

  it("warns that blocking removes the picture that is there", () => {
    render(<PhotoLockCard memberId="m1" locked={false} onChanged={vi.fn()} />);

    expect(screen.getByText(/يحذف الصورة الحالية/)).toBeTruthy();
  });

  it("says the member is blocked and offers to let them back in", () => {
    render(<PhotoLockCard memberId="m1" locked onChanged={vi.fn()} />);

    expect(screen.getByText("العضو ممنوع من تغيير صورته")).toBeTruthy();
    expect(screen.getByRole("button", { name: /السماح بتغيير الصورة/ })).toBeTruthy();
  });

  it("sends the block and tells the page to reload", async () => {
    const onChanged = vi.fn();
    render(<PhotoLockCard memberId="m1" locked={false} onChanged={onChanged} />);

    await userEvent.click(screen.getByRole("button", { name: /منع تغيير الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: true });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("sends the lift the other way round", async () => {
    render(<PhotoLockCard memberId="m1" locked onChanged={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /السماح بتغيير الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: false });
  });

  it("shows what went wrong and leaves the card as it was", async () => {
    patch.mockRejectedValue(new Error("لا صلاحية"));
    const onChanged = vi.fn();
    render(<PhotoLockCard memberId="m1" locked={false} onChanged={onChanged} />);

    await userEvent.click(screen.getByRole("button", { name: /منع تغيير الصورة/ }));

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
