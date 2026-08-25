import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TeamFormList from "./TeamFormList";

function show(form: ("W" | "D" | "L")[]) {
  cleanup();
  return render(
    <TeamFormList
      teams={[{ teamId: "t1", name: "فريق النجم", biggestWin: null, unbeatenStreak: 0, form }]}
    />,
  );
}

describe("TeamFormList", () => {
  it("draws a result as an icon in a filled circle, not a letter", () => {
    const { container } = show(["W"]);

    const pip = container.querySelector(".form-pip") as HTMLElement;
    expect(pip.textContent).toBe("");
    expect(pip.querySelector("svg")).not.toBeNull();
    expect(pip.getAttribute("style")).toContain("rgb(5, 150, 105)");
  });

  it("paints a loss red and a draw grey", () => {
    const { container } = show(["L", "D"]);

    const pips = [...container.querySelectorAll(".form-pip")] as HTMLElement[];
    expect(pips[0].getAttribute("style")).toContain("rgb(220, 38, 38)");
    expect(pips[1].getAttribute("style")).toContain("var(--text-muted)");
  });

  it("still says in words what each circle means", () => {
    show(["W", "D", "L"]);

    expect(screen.getByLabelText("فوز")).toBeDefined();
    expect(screen.getByLabelText("تعادل")).toBeDefined();
    expect(screen.getByLabelText("خسارة")).toBeDefined();
  });

  it("lets the circles speak for themselves, with no label", () => {
    const { container } = show(["W", "D", "L"]);

    expect(container.textContent).not.toContain("آخر");
    expect(container.querySelectorAll(".form-pip")).toHaveLength(3);
  });

  it("has no run of circles for a team that has not played", () => {
    const { container } = show([]);

    expect(container.querySelector(".form-pip")).toBeNull();
  });
});
