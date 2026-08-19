import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardTabs from "./BoardTabs";

const boards = [
  { id: "b1", title: "ترتيب اليوم", rows: [], mine: null },
  { id: "b2", title: "ترتيب الأسبوع", rows: [], mine: null },
  { id: "b3", title: "الترتيب العام", rows: [], mine: null },
];

describe("BoardTabs", () => {
  it("offers a tab for each ranking the quiz shows", () => {
    render(<BoardTabs boards={boards} active="b1" onSelect={() => {}} />);

    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks the one that is open", () => {
    render(<BoardTabs boards={boards} active="b2" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "ترتيب الأسبوع" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("falls back to the first when the open one is unknown", () => {
    render(<BoardTabs boards={boards} active={null} onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "ترتيب اليوم" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("reports the ranking that was picked", async () => {
    const onSelect = vi.fn();
    render(<BoardTabs boards={boards} active="b1" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(onSelect).toHaveBeenCalledWith("b3");
  });

  it("shows no tabs when there is only one ranking", () => {
    render(<BoardTabs boards={[boards[0]]} active="b1" onSelect={() => {}} />);

    expect(screen.queryByRole("tab")).toBeNull();
  });
});
