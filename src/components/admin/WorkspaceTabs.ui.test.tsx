import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import WorkspaceTabs, { type WorkspaceSection } from "./WorkspaceTabs";

const SECTIONS: WorkspaceSection[] = [
  {
    key: "setup",
    label: "الإعداد",
    tabs: [{ key: "details", label: "التفاصيل", icon: "pencil" }],
  },
  {
    key: "people",
    label: "المشاركون",
    tabs: [
      { key: "registrations", label: "المسجلون", icon: "users", badge: 3 },
      { key: "teams", label: "الفرق", icon: "shield", badge: 0 },
    ],
  },
  {
    key: "records",
    label: "السجلات",
    tabs: [
      { key: "finance", label: "المالية", icon: "wallet" },
      { key: "log", label: "السجل", icon: "list" },
    ],
  },
];

function show(active = "details", onPick = vi.fn()) {
  cleanup();
  const view = render(<WorkspaceTabs sections={SECTIONS} active={active} onPick={onPick} />);
  return { onPick, view };
}

describe("the two levels of the workspace row", () => {
  it("names every section whatever is open", () => {
    show();

    expect(screen.getByRole("button", { name: /الإعداد/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /المشاركون/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /السجلات/ })).toBeDefined();
  });

  it("shows only the tabs of the section holding the open tab", () => {
    show("finance");

    expect(screen.getByText("المالية")).toBeDefined();
    expect(screen.getByText("السجل")).toBeDefined();
    expect(screen.queryByText("المسجلون")).toBeNull();
    expect(screen.queryByText("التفاصيل")).toBeNull();
  });

  it("marks the open tab and the section it sits in", () => {
    show("log");

    expect(screen.getByRole("button", { name: /السجلات/ }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByText("السجل").closest("button")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("المالية").closest("button")?.getAttribute("aria-current")).toBeNull();
  });

  it("opens the first tab of a section when the section is picked", () => {
    const { onPick } = show("details");

    fireEvent.click(screen.getByRole("button", { name: /المشاركون/ }));

    expect(onPick).toHaveBeenCalledWith("registrations");
  });

  it("hands the picked tab back", () => {
    const { onPick } = show("registrations");

    fireEvent.click(screen.getByText("الفرق"));

    expect(onPick).toHaveBeenCalledWith("teams");
  });

  it("counts what waits on the admin, and stays quiet at zero", () => {
    show("registrations");

    expect(
      screen.getByText("المسجلون").closest("button")?.querySelector("span[dir='ltr']")?.textContent,
    ).toBe("3");
    expect(screen.queryByText("0")).toBeNull();
  });

  it("scrolls each level rather than wrapping onto another line", () => {
    const { view } = show();

    const strips = view.container.querySelectorAll(".tab-strip");

    expect(strips.length).toBe(2);
    strips.forEach((strip) => expect(strip.className).not.toContain("flex-wrap"));
  });

  it("falls back to the first section when the open tab is not in any of them", () => {
    show("nothing");

    expect(screen.getByText("التفاصيل")).toBeDefined();
    expect(screen.getByRole("button", { name: /الإعداد/ }).getAttribute("aria-current")).toBe(
      "true",
    );
  });
});

describe("the badge rule on the workspace row", () => {
  it("rolls the work waiting inside a section up onto its name", () => {
    show("details");

    expect(
      screen.getByRole("button", { name: /المشاركون/ }).querySelector("span[dir='ltr']")
        ?.textContent,
    ).toBe("3");
  });

  it("leaves a section alone when nothing inside it is waiting", () => {
    show("details");

    expect(
      screen.getByRole("button", { name: /السجلات/ }).querySelector("span[dir='ltr']"),
    ).toBeNull();
  });

  it("counts a tab that carries none as nothing waiting", () => {
    show("finance");

    for (const label of ["المالية", "السجل"]) {
      expect(
        screen.getByText(label).closest("button")?.querySelector("span[dir='ltr']"),
      ).toBeNull();
    }
  });

  it("keeps the count off a tab that can carry one but has nothing", () => {
    show("registrations");

    expect(
      screen.getByText("الفرق").closest("button")?.querySelector("span[dir='ltr']"),
    ).toBeNull();
    expect(
      screen.getByText("المسجلون").closest("button")?.querySelector("span[dir='ltr']")?.textContent,
    ).toBe("3");
  });
});
