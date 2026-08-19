import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InlineName from "./InlineName";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({});
});

function show(onRenamed = vi.fn()) {
  const onRowClick = vi.fn();
  render(
    <div onClick={onRowClick}>
      <InlineName memberId="m1" fullName="محمد ولد أحمد" onRenamed={onRenamed} />
    </div>,
  );
  return { onRenamed, onRowClick };
}

async function openEditor() {
  await userEvent.click(screen.getByRole("button", { name: /تعديل اسم/ }));
}

describe("correcting a name on the row", () => {
  it("shows the name until the pencil is used", () => {
    show();

    expect(screen.getByText("محمد ولد أحمد")).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("does not open the member file while the name is being corrected", async () => {
    const { onRowClick } = show();

    await openEditor();
    await userEvent.type(screen.getByRole("textbox"), "!");

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("saves the correction and tells the list", async () => {
    const { onRenamed } = show();

    await openEditor();
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "محمد ولد أحمدو");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", {
        fullName: "محمد ولد أحمدو",
      }),
    );
    expect(onRenamed).toHaveBeenCalledWith("محمد ولد أحمدو");
  });

  it("saves on Enter too", async () => {
    show();

    await openEditor();
    await userEvent.type(screen.getByRole("textbox"), "و{Enter}");

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", {
        fullName: "محمد ولد أحمدو",
      }),
    );
  });

  it("drops the correction on Escape", async () => {
    show();

    await openEditor();
    await userEvent.type(screen.getByRole("textbox"), "و{Escape}");

    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText("محمد ولد أحمد")).toBeDefined();
  });

  it("writes nothing when the name comes back unchanged", async () => {
    show();

    await openEditor();
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(patch).not.toHaveBeenCalled();
  });

  it("refuses to save an empty name", async () => {
    show();

    await openEditor();
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(patch).not.toHaveBeenCalled();
  });

  it("keeps the failure on the row, with the correction still in hand", async () => {
    patch.mockRejectedValue(new Error("الاسم طويل جداً"));
    show();

    await openEditor();
    await userEvent.type(screen.getByRole("textbox"), "و");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(await screen.findByText("الاسم طويل جداً")).toBeDefined();
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});
