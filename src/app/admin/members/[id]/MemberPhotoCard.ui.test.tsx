import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberPhotoCard from "./MemberPhotoCard";
import { memberPhoto as texts } from "@/lib/texts";

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

  it("asks before clearing the picture, and says what survives", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.remove) }));

    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(texts.confirmRemove)).toBeTruthy();
  });

  it("clears the picture once the removal is confirmed", async () => {
    const onChanged = show();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.remove) }));
    await userEvent.click(screen.getAllByRole("button", { name: texts.remove })[1]);

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photo: null });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("removes the picture of a blocked member too", async () => {
    show({ locked: true });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.remove) }));
    await userEvent.click(screen.getAllByRole("button", { name: texts.remove })[1]);

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photo: null });
  });

  it("shows what went wrong and leaves the card as it was", async () => {
    patch.mockRejectedValue(new Error("لا صلاحية"));
    const onChanged = show();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.remove) }));
    await userEvent.click(screen.getAllByRole("button", { name: texts.remove })[1]);

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe("blocking the picture", () => {
  it("shows the state as a badge rather than a sentence", () => {
    show({ locked: true });

    expect(screen.getByText(texts.lockedBadge)).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(texts.unlock) })).toBeTruthy();
  });

  it("wears no badge while the member may still change their picture", () => {
    show({ locked: false });

    expect(screen.queryByText(texts.lockedBadge)).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(texts.lock) })).toBeTruthy();
  });

  it("carries no sentence under either button", () => {
    const { container } = render(
      <MemberPhotoCard memberId="m1" photo="a.webp" locked={false} onChanged={vi.fn()} />,
    );

    expect(container.querySelectorAll("p.text-xs")).toHaveLength(0);
  });

  it("asks before blocking, since blocking deletes the picture that is there", async () => {
    show({ locked: false });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.lock) }));

    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(texts.confirmLock)).toBeTruthy();
  });

  it("sends the block once it is confirmed", async () => {
    const onChanged = show({ locked: false });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.lock) }));
    await userEvent.click(screen.getAllByRole("button", { name: texts.lock })[1]);

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: true });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("blocks without asking when there is no picture to lose", async () => {
    show({ photo: null, locked: false });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.lock) }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: true });
  });

  it("sends the lift the other way round, with nothing to confirm", async () => {
    show({ locked: true });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.unlock) }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: false });
  });

  it("shows what went wrong and leaves the card as it was", async () => {
    patch.mockRejectedValue(new Error("لا صلاحية"));
    const onChanged = show({ photo: null, locked: false });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.lock) }));

    expect(await screen.findByText(/لا صلاحية/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
