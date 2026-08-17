import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UpToDateSummary from "./UpToDateSummary";

const noop = vi.fn();

function show(paid: number, active: number) {
  render(
    <UpToDateSummary
      year={2026}
      paid={paid}
      active={active}
      showing={null}
      onShowPaid={noop}
      onShowBehind={noop}
    />,
  );
}

describe("the membership summary", () => {
  it("puts the number before the noun, which is the order arabic reads", () => {
    show(91, 117);

    expect(screen.getByText("91 مسدّداً")).toBeTruthy();
    expect(screen.getByText("26 متأخراً")).toBeTruthy();
  });

  it("takes the plural from three to ten", () => {
    show(7, 10);

    expect(screen.getByText("7 مسدّدين")).toBeTruthy();
    expect(screen.getByText("3 متأخرين")).toBeTruthy();
  });

  it("carries none as a plural rather than a bare singular", () => {
    show(0, 5);

    expect(screen.getByText("0 مسدّدين")).toBeTruthy();
  });

  it("counts everyone who is not paid up for the year as behind", () => {
    show(91, 117);

    expect(screen.getByText("من 117 عضواً نشطاً")).toBeTruthy();
  });

  it("says nothing at all when there are no active members", () => {
    const { container } = render(
      <UpToDateSummary
        year={2026}
        paid={0}
        active={0}
        showing={null}
        onShowPaid={noop}
        onShowBehind={noop}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
