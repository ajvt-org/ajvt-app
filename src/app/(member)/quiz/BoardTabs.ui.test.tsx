import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardTabs from "./BoardTabs";

const tabs = [
  { id: "b1", title: "ترتيب اليوم" },
  { id: "b2", title: "ترتيب الأسبوع" },
  { id: "b3", title: "الترتيب العام" },
];

describe("BoardTabs", () => {
  it("offers a tab for each ranking the quiz shows", () => {
    render(<BoardTabs tabs={tabs} active="b1" onSelect={() => {}} />);

    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks the one that is open", () => {
    render(<BoardTabs tabs={tabs} active="b2" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "ترتيب الأسبوع" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("falls back to the first when the open one is unknown", () => {
    render(<BoardTabs tabs={tabs} active={null} onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "ترتيب اليوم" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("reports the ranking that was picked", async () => {
    const onSelect = vi.fn();
    render(<BoardTabs tabs={tabs} active="b1" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "الترتيب العام" }));

    expect(onSelect).toHaveBeenCalledWith("b3");
  });

  it("shows no tabs when there is only one ranking", () => {
    render(<BoardTabs tabs={[tabs[0]]} active="b1" onSelect={() => {}} />);

    expect(screen.queryByRole("tab")).toBeNull();
  });
});
