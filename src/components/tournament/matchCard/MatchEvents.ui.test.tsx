import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchEvents from "./MatchEvents";
import type { MatchEventRow } from "@/lib/matchEvents";
import { matchDisplay } from "@/lib/texts";

const at = (label: string) => ({ kind: "minute" as const, label });
const unknown = (count: number) => ({ kind: "unknown" as const, count });

const base: MatchEventRow = {
  key: "p1",
  side: "home",
  type: "goal",
  name: "أسامه محمد",
  photo: null,
  minutes: [at("7'")],
};

const goal = (over: Partial<MatchEventRow> = {}): MatchEventRow => ({ ...base, ...over });

function sections(container: HTMLElement) {
  return [...container.querySelectorAll("[style*='1fr auto 1fr']")] as HTMLElement[];
}

describe("MatchEvents", () => {
  it("renders nothing for a match with no events", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("shows the goal icon once for the whole section", () => {
    cleanup();
    const { container } = render(
      <MatchEvents
        rows={[goal(), goal({ key: "p2", name: "باه الصبار", minutes: [at("30'")] })]}
      />,
    );

    expect(sections(container)).toHaveLength(1);
    expect(sections(container)[0].children[1].querySelectorAll("svg")).toHaveLength(1);
  });

  it("puts the home scorers on the right and the away scorers on the left", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[goal(), goal({ key: "a", side: "away", name: "سالم" })]} />,
    );

    const [home, , away] = sections(container)[0].children;
    expect(home.textContent).toContain("أسامه محمد");
    expect(away.textContent).toContain("سالم");
  });

  it("keeps the middle column even when only one side scored", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal()]} />);

    expect(sections(container)[0].childElementCount).toBe(3);
  });

  it("reads photo, name, minutes on the home side and turns it around on the away side", () => {
    cleanup();
    const { container } = render(
      <MatchEvents
        rows={[goal(), goal({ key: "a", side: "away", name: "سالم", minutes: [at("9'")] })]}
      />,
    );

    const [home, , away] = sections(container)[0].children;
    expect(home.children[0].querySelector("svg,img")).not.toBeNull();
    expect(home.children[2].textContent).toBe("7'");
    expect(away.children[0].textContent).toBe("9'");
    expect(away.children[1].querySelector("svg,img")).not.toBeNull();
  });

  it("breaks a hat-trick's minutes into rows of two", () => {
    cleanup();
    const { container } = render(
      <MatchEvents
        rows={[goal({ minutes: [at("7'"), at("30'"), at("45'"), at("60'"), at("88'")] })]}
      />,
    );

    const minutes = sections(container)[0].children[0].children[2];
    expect(minutes.childElementCount).toBe(3);
    expect(minutes.children[0].textContent).toBe("7'30'");
  });

  it("marks a goal with no recorded minute instead of printing a number", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal({ minutes: [unknown(1)] })]} />);

    const minutes = sections(container)[0].children[0].children[2];
    expect(minutes.textContent).toBe("");
    expect(minutes.querySelector("svg")).not.toBeNull();
    expect(
      container.querySelector(`[aria-label='${matchDisplay.unknownMinute(1)}']`),
    ).not.toBeNull();
  });

  it("keeps a timed goal beside the ones nobody wrote a minute for", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[goal({ minutes: [at("7'"), unknown(2)] })]} />,
    );

    const minutes = sections(container)[0].children[0].children[2];
    expect(minutes.textContent).toBe(`7'${matchDisplay.unknownMinuteTally(2)}`);
    expect(
      container.querySelector(`[aria-label='${matchDisplay.unknownMinute(2)}']`),
    ).not.toBeNull();
  });

  it("gives the reds a section of their own and leaves the yellows out", () => {
    cleanup();
    const { container } = render(
      <MatchEvents
        rows={[
          goal(),
          goal({ key: "r", type: "red", name: "أحمد" }),
          goal({ key: "y", type: "yellow", name: "علي" }),
        ]}
      />,
    );

    expect(sections(container)).toHaveLength(2);
    expect(container.textContent).toContain("أحمد");
    expect(container.textContent).not.toContain("علي");
  });

  it("renders nothing when a match has only yellows", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal({ type: "yellow" })]} />);

    expect(container.firstChild).toBeNull();
  });

  it("rules a line off before the man of the match and centres it", () => {
    cleanup();
    const motm = goal({ key: "m", type: "motm", side: null, team: "فريق النجم" });
    const { container } = render(<MatchEvents rows={[goal(), motm]} />);

    const rule = container.querySelector("[style*='border-top']");
    expect(rule).not.toBeNull();
    expect((rule?.nextElementSibling as HTMLElement).className).toContain("justify-center");
    expect(container.textContent).toContain("(فريق النجم)");
    expect(container.textContent).not.toContain("رجل المباراة:");
  });

  it("marks the man of the match for a screen reader without printing the label", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[goal({ key: "m", type: "motm", side: null })]} />,
    );

    expect(container.querySelector("[aria-label='رجل المباراة']")).not.toBeNull();
  });

  it("skips the rule when the man of the match is all there is", () => {
    cleanup();
    const { container } = render(
      <MatchEvents rows={[goal({ key: "m", type: "motm", side: null })]} />,
    );

    expect(container.querySelector("[style*='border-top']")).toBeNull();
  });

  it("paints the rows for a dark card", () => {
    cleanup();
    const { container } = render(<MatchEvents rows={[goal()]} tone="dark" />);

    expect(sections(container)[0].getAttribute("style")).toContain("rgba(255, 255, 255, 0.9)");
  });
});
