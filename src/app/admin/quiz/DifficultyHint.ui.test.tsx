import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DifficultyHint from "./DifficultyHint";

describe("DifficultyHint", () => {
  it("lists the bands while nothing usable is typed", () => {
    render(<DifficultyHint points="" />);

    expect(screen.getByText(/سهل 10 إلى 49/)).toBeDefined();
    expect(screen.getByText(/صعب 80 إلى 100/)).toBeDefined();
  });

  it("names the band the points fall in", () => {
    const { unmount } = render(<DifficultyHint points="30" />);
    expect(screen.getByText("سهل")).toBeDefined();
    unmount();

    const second = render(<DifficultyHint points="60" />);
    expect(screen.getByText("متوسط")).toBeDefined();
    second.unmount();

    render(<DifficultyHint points="90" />);
    expect(screen.getByText("صعب")).toBeDefined();
  });

  it("gives a boundary to the harder band", () => {
    const { unmount } = render(<DifficultyHint points="49" />);
    expect(screen.getByText("سهل")).toBeDefined();
    unmount();

    render(<DifficultyHint points="50" />);
    expect(screen.getByText("متوسط")).toBeDefined();
  });

  it("falls back to the bands when the points are outside the range", () => {
    render(<DifficultyHint points="500" />);

    expect(screen.getByText(/سهل 10 إلى 49/)).toBeDefined();
  });
});
