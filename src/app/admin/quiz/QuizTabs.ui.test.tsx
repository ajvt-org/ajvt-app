import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizTabs, { isQuizTab } from "./QuizTabs";

describe("QuizTabs", () => {
  it("offers the competitions and the bank", () => {
    render(<QuizTabs active="competitions" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: /المسابقات/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /بنك الأسئلة/ })).toBeDefined();
  });

  it("marks the one that is open", () => {
    render(<QuizTabs active="bank" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: /بنك الأسئلة/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: /المسابقات/ }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("reports the tab that was pressed", async () => {
    const onSelect = vi.fn();
    render(<QuizTabs active="competitions" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: /بنك الأسئلة/ }));

    expect(onSelect).toHaveBeenCalledWith("bank");
  });
});

describe("isQuizTab", () => {
  it("takes the names it knows", () => {
    expect(isQuizTab("competitions")).toBe(true);
    expect(isQuizTab("bank")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isQuizTab("questions")).toBe(false);
    expect(isQuizTab(null)).toBe(false);
  });
});
