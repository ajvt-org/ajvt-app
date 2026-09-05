import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackButton from "./BackButton";

const back = vi.fn();
const canUnwind = vi.fn();
vi.mock("@/lib/historyTrail", () => ({ appTrail: { canUnwind: () => canUnwind() } }));

beforeEach(() => {
  vi.spyOn(window.history, "back").mockImplementation(back);
  back.mockClear();
  canUnwind.mockReturnValue(false);
});

describe("BackButton", () => {
  it("carries the given path, so a cold arrival has somewhere to go", () => {
    render(<BackButton href="/activities" />);

    expect(screen.getByLabelText("رجوع").getAttribute("href")).toBe("/activities");
  });

  it("follows that path when there is nothing to unwind", async () => {
    render(<BackButton href="/activities" />);
    await userEvent.click(screen.getByLabelText("رجوع"));

    expect(back).not.toHaveBeenCalled();
  });

  it("unwinds the history instead of following the path when the reader came from inside the app", async () => {
    canUnwind.mockReturnValue(true);
    render(<BackButton href="/activities" />);

    const click = screen.getByLabelText("رجوع");
    await userEvent.click(click);

    expect(back).toHaveBeenCalled();
  });

  it("leaves the path alone for a click that asks for a new tab", () => {
    canUnwind.mockReturnValue(true);
    render(<BackButton href="/activities" />);

    fireEvent.click(screen.getByLabelText("رجوع"), { metaKey: true });

    expect(back).not.toHaveBeenCalled();
  });

  it("calls the handler it was given rather than touching history", async () => {
    canUnwind.mockReturnValue(true);
    const onBack = vi.fn();
    render(<BackButton onBack={onBack} />);

    await userEvent.click(screen.getByRole("button", { name: "رجوع" }));

    expect(onBack).toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });
});
