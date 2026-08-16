import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentTabs from "./TournamentTabs";

const panels = [
  { key: "standings", label: "الترتيب", icon: "trophy" as const, content: <p>جدول الترتيب</p> },
  {
    key: "matches",
    label: "المباريات",
    icon: "calendar" as const,
    content: <p>قائمة المباريات</p>,
  },
  { key: "teams", label: "الفرق", icon: "users" as const, content: <p>قائمة الفرق</p> },
];

describe("TournamentTabs", () => {
  it("opens on the first panel and hides the rest", () => {
    render(<TournamentTabs panels={panels} />);

    expect(screen.getByText("جدول الترتيب")).toBeDefined();
    expect(screen.queryByText("قائمة المباريات")).toBeNull();
    expect(screen.queryByText("قائمة الفرق")).toBeNull();
  });

  it("swaps the panel when another tab is picked", async () => {
    render(<TournamentTabs panels={panels} />);

    await userEvent.click(screen.getByRole("tab", { name: "المباريات" }));

    expect(screen.getByText("قائمة المباريات")).toBeDefined();
    expect(screen.queryByText("جدول الترتيب")).toBeNull();
  });

  it("says which tab is the one being read", async () => {
    render(<TournamentTabs panels={panels} />);

    await userEvent.click(screen.getByRole("tab", { name: "الفرق" }));

    expect(screen.getByRole("tab", { name: "الفرق" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "الترتيب" }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });
});
