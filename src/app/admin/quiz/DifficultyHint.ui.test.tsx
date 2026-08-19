import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DifficultyHint from "./DifficultyHint";

describe("DifficultyHint", () => {
  it("lists the bands while nothing usable is typed", () => {
    render(<DifficultyHint points="" />);

    expect(screen.getByText(/سهل 1 إلى 10/)).toBeDefined();
    expect(screen.getByText(/صعب 17 إلى 20/)).toBeDefined();
  });

  it("names the band the points fall in", () => {
    const { unmount } = render(<DifficultyHint points="5" />);
    expect(screen.getByText("سهل")).toBeDefined();
    unmount();

    const second = render(<DifficultyHint points="13" />);
    expect(screen.getByText("متوسط")).toBeDefined();
    second.unmount();

    render(<DifficultyHint points="19" />);
    expect(screen.getByText("صعب")).toBeDefined();
  });

  it("keeps each band top inside that band", () => {
    const { unmount } = render(<DifficultyHint points="10" />);
    expect(screen.getByText("سهل")).toBeDefined();
    unmount();

    render(<DifficultyHint points="11" />);
    expect(screen.getByText("متوسط")).toBeDefined();
  });

  it("falls back to the bands when the points are outside the range", () => {
    render(<DifficultyHint points="50" />);

    expect(screen.getByText(/سهل 1 إلى 10/)).toBeDefined();
  });
});
