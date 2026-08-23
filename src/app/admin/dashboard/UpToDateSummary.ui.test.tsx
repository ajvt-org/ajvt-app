import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UpToDateSummary from "./UpToDateSummary";

const noop = vi.fn();

function show(current: number, active: number) {
  render(
    <UpToDateSummary
      year={2026}
      current={current}
      active={active}
      showing={null}
      onShowCurrent={noop}
      onShowFormer={noop}
    />,
  );
}

describe("the membership summary", () => {
  it("counts the current and former members of the year, plainly", () => {
    show(91, 117);

    expect(screen.getByText("91 حالي")).toBeTruthy();
    expect(screen.getByText("26 سابق")).toBeTruthy();
    expect(screen.getByText("من 117 عضواً نشطاً")).toBeTruthy();
  });

  it("says nothing at all when there are no active members", () => {
    const { container } = render(
      <UpToDateSummary
        year={2026}
        current={0}
        active={0}
        showing={null}
        onShowCurrent={noop}
        onShowFormer={noop}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
