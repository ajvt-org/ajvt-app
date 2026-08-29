import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("counts from one rather than from zero", () => {
    render(<ProgressBar stepIndex={0} total={3} />);

    expect(screen.getByText("الخطوة 1 من 3")).toBeDefined();
  });

  it("says how many steps this visitor actually walks", () => {
    render(<ProgressBar stepIndex={1} total={2} />);

    expect(screen.getByText("الخطوة 2 من 2")).toBeDefined();
  });
});
