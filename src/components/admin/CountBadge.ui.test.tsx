import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CountBadge from "./CountBadge";

function show(count: number) {
  cleanup();
  return render(<CountBadge count={count} />);
}

describe("the count of work waiting", () => {
  it("says how much is waiting", () => {
    show(3);

    expect(screen.getByText("3")).toBeDefined();
  });

  it("stays away when nothing is waiting", () => {
    const { container } = show(0);

    expect(container.innerHTML).toBe("");
  });

  it("stays away rather than counting backwards", () => {
    const { container } = show(-1);

    expect(container.innerHTML).toBe("");
  });

  it("stops counting past nine", () => {
    show(40);

    expect(screen.getByText("+9")).toBeDefined();
  });

  it("reads its number left to right inside a right to left screen", () => {
    const { container } = show(5);

    expect(container.firstElementChild?.getAttribute("dir")).toBe("ltr");
  });
});
