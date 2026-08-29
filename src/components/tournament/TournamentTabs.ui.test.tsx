import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentTabs from "./TournamentTabs";

function Counter() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN((v) => v + 1)}>
      عدّاد {n}
    </button>
  );
}

const panels = [
  { key: "standings", label: "الترتيب", icon: "trophy" as const, content: <p>جدول الترتيب</p> },
  {
    key: "matches",
    label: "المباريات",
    icon: "calendar" as const,
    content: <Counter />,
  },
  { key: "teams", label: "الفرق", icon: "users" as const, content: <p>قائمة الفرق</p> },
];

describe("TournamentTabs", () => {
  it("opens on the first panel and shows no other", () => {
    render(<TournamentTabs panels={panels} />);

    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByText("جدول الترتيب")).toBeDefined();
  });

  it("swaps the panel when another tab is picked", async () => {
    render(<TournamentTabs panels={panels} />);

    await userEvent.click(screen.getByRole("tab", { name: "المباريات" }));

    const open = screen.getAllByRole("tabpanel");
    expect(open).toHaveLength(1);
    expect(open[0].textContent).toContain("عدّاد");
    expect(open[0].textContent).not.toContain("جدول الترتيب");
  });

  it("says which tab is the one being read", async () => {
    render(<TournamentTabs panels={panels} />);

    await userEvent.click(screen.getByRole("tab", { name: "الفرق" }));

    expect(screen.getByRole("tab", { name: "الفرق" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "الترتيب" }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("keeps what a reader did in a panel when they come back to it", async () => {
    render(<TournamentTabs panels={panels} />);

    await userEvent.click(screen.getByRole("tab", { name: "المباريات" }));
    await userEvent.click(screen.getByRole("button", { name: "عدّاد 0" }));
    await userEvent.click(screen.getByRole("tab", { name: "الترتيب" }));
    await userEvent.click(screen.getByRole("tab", { name: "المباريات" }));

    expect(screen.getByRole("button", { name: "عدّاد 1" })).toBeDefined();
  });

  it("never mounts a panel that was not opened", async () => {
    render(<TournamentTabs panels={panels} />);

    expect(screen.queryByText("قائمة الفرق")).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "الفرق" }));
    await userEvent.click(screen.getByRole("tab", { name: "الترتيب" }));

    expect(screen.queryByText("قائمة الفرق")).not.toBeNull();
  });
});
