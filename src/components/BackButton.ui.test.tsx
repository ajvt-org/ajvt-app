import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BackButton from "./BackButton";

const back = vi.fn();
const previousIs = vi.fn();
const noteReplacement = vi.fn();

vi.mock("@/lib/historyTrail", () => ({
  appTrail: {
    previousIs: (url: string) => previousIs(url),
    noteReplacement: (url: string) => noteReplacement(url),
  },
}));

function press(options: MouseEventInit = {}) {
  const click = new MouseEvent("click", { bubbles: true, cancelable: true, ...options });
  screen.getByLabelText("رجوع").dispatchEvent(click);
  return click;
}

beforeEach(() => {
  vi.spyOn(window.history, "back").mockImplementation(back);
  back.mockClear();
  noteReplacement.mockClear();
  previousIs.mockReturnValue(false);
});

describe("BackButton", () => {
  it("carries the given path, so a reader can open the parent in a new tab", () => {
    render(<BackButton href="/activities" />);

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/activities");
  });

  it("unwinds when the entry behind the reader is the parent", () => {
    previousIs.mockReturnValue(true);
    render(<BackButton href="/activities" />);
    const click = press();

    expect(previousIs).toHaveBeenCalledWith("/activities");
    expect(back).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
  });

  it("follows the path when the reader arrived from somewhere else", () => {
    render(<BackButton href="/activities" />);
    const click = press();

    expect(back).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it("tells the trail before it replaces, so the entry behind stays the real one", () => {
    render(<BackButton href="/activities" />);
    press();

    expect(noteReplacement).toHaveBeenCalledWith("/activities");
  });

  it("leaves the path alone for a click that asks for a new tab", () => {
    previousIs.mockReturnValue(true);
    render(<BackButton href="/activities" />);
    press({ metaKey: true });

    expect(back).not.toHaveBeenCalled();
    expect(noteReplacement).not.toHaveBeenCalled();
  });

  it("is a link on every screen, so no caller can render an arrow that skips the rule", () => {
    render(<BackButton href="/activities" />);

    expect(screen.getByLabelText("رجوع").tagName).toBe("A");
  });
});
