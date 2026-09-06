import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BackButton from "./BackButton";

vi.mock("@/lib/historyTrail", () => ({
  appTrail: { previousIs: () => false, noteReplacement: () => {} },
}));

describe("BackButton", () => {
  it("is the icon arrow the member screens wear, carrying the parent", () => {
    render(<BackButton href="/activities" />);

    const arrow = screen.getByLabelText("رجوع");
    expect(arrow.tagName).toBe("A");
    expect(arrow.getAttribute("href")).toBe("/activities");
    expect(arrow.querySelector("svg")).not.toBeNull();
  });
});
