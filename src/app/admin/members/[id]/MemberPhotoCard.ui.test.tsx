import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberPhotoCard from "./MemberPhotoCard";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...a: unknown[]) => patch(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({});
});

function show(over: { photo?: string | null; locked?: boolean; onChanged?: () => void } = {}) {
  const onChanged = over.onChanged ?? vi.fn();
  render(
    <MemberPhotoCard
      memberId="m1"
      photo={over.photo === undefined ? "a.webp" : over.photo}
      locked={over.locked ?? false}
      onChanged={onChanged}
    />,
  );
  return onChanged;
}

describe("removing the picture", () => {
  it("offers the removal only when there is a picture", () => {
    show({ photo: null });

    expect(screen.queryByRole("button", { name: /حذف الصورة/ })).toBeNull();
    expect(screen.getByText("لا توجد صورة على هذا الحساب")).toBeTruthy();
  });

  it("clears the picture without asking for a replacement", async () => {
    const onChanged = show();

    await userEvent.click(screen.getByRole("button", { name: /حذف الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photo: null });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("says the removal does not block the member", () => {
    show();

    expect(screen.getByText(/دون أن يمنع العضو/)).toBeTruthy();
  });

  it("removes the picture of a blocked member too", async () => {
    show({ locked: true });

    await userEvent.click(screen.getByRole("button", { name: /حذف الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photo: null });
  });

  it("shows what went wrong and leaves the card as it was", async () => {
    patch.mockRejectedValue(new Error("لا صلاحية"));
    const onChanged = show();

    await userEvent.click(screen.getByRole("button", { name: /حذف الصورة/ }));

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe("blocking the picture", () => {
  it("says the member may change their picture and offers to stop it", () => {
    show({ locked: false });

    expect(screen.getByText("العضو يستطيع تغيير صورته")).toBeTruthy();
    expect(screen.getByRole("button", { name: /منع تغيير الصورة/ })).toBeTruthy();
  });

  it("warns that blocking removes the picture that is there", () => {
    show({ locked: false });

    expect(screen.getByText(/يحذف الصورة الحالية/)).toBeTruthy();
  });

  it("says the member is blocked and offers to let them back in", () => {
    show({ locked: true });

    expect(screen.getByText("العضو ممنوع من تغيير صورته")).toBeTruthy();
    expect(screen.getByRole("button", { name: /السماح بتغيير الصورة/ })).toBeTruthy();
  });

  it("sends the block and tells the page to reload", async () => {
    const onChanged = show({ locked: false });

    await userEvent.click(screen.getByRole("button", { name: /منع تغيير الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: true });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("sends the lift the other way round", async () => {
    show({ locked: true });

    await userEvent.click(screen.getByRole("button", { name: /السماح بتغيير الصورة/ }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: false });
  });

  it("shows what went wrong and leaves the card as it was", async () => {
    patch.mockRejectedValue(new Error("لا صلاحية"));
    const onChanged = show({ locked: false });

    await userEvent.click(screen.getByRole("button", { name: /منع تغيير الصورة/ }));

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
