import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardsEditor from "./BoardsEditor";
import { DEFAULT_BOARDS } from "@/lib/competitionConfig";

const setup = (over: { boards?: typeof DEFAULT_BOARDS; disabled?: boolean } = {}) => {
  const onChange = vi.fn();
  render(
    <BoardsEditor
      boards={over.boards ?? DEFAULT_BOARDS}
      disabled={over.disabled ?? false}
      onChange={onChange}
    />,
  );
  return { onChange };
};

describe("BoardsEditor", () => {
  it("lists every ranking the quiz shows", () => {
    setup();

    expect(screen.getByDisplayValue("ترتيب الجولة")).toBeDefined();
    expect(screen.getByDisplayValue("الترتيب العام")).toBeDefined();
  });

  it("renames a ranking", async () => {
    const { onChange } = setup();

    await userEvent.type(screen.getByLabelText("عنوان الترتيب 1"), "ي");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0][0].title).toBe("ترتيب الجولةي");
  });

  it("changes how many rounds a ranking covers", async () => {
    const { onChange } = setup();

    await userEvent.clear(screen.getByLabelText("جولات الترتيب 2"));

    expect(onChange.mock.calls[0][0][1].blockRounds).toBe(0);
  });

  it("adds a ranking", async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole("button", { name: "إضافة ترتيب" }));

    expect(onChange.mock.calls[0][0]).toHaveLength(DEFAULT_BOARDS.length + 1);
  });

  it("removes a ranking", async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole("button", { name: "حذف الترتيب 2" }));

    expect(onChange.mock.calls[0][0].map((b: { title: string }) => b.title)).toEqual([
      "ترتيب الجولة",
      "الترتيب العام",
    ]);
  });

  it("keeps the last ranking from being removed", () => {
    setup({ boards: [DEFAULT_BOARDS[0]] });

    expect(screen.queryByRole("button", { name: /حذف الترتيب/ })).toBeNull();
  });

  it("offers nothing to change once the quiz has started", () => {
    setup({ disabled: true });

    expect((screen.getByLabelText("عنوان الترتيب 1") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "إضافة ترتيب" })).toBeNull();
    expect(screen.queryByRole("button", { name: /حذف الترتيب/ })).toBeNull();
  });
});
