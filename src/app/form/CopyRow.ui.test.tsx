import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CopyRow from "./CopyRow";

describe("CopyRow", () => {
  it("offers to copy the value it shows", () => {
    const onCopy = vi.fn();
    render(<CopyRow label="المبلغ" value="2100" copied={false} onCopy={onCopy} />);

    expect(screen.getByText("2100")).toBeDefined();
    fireEvent.click(screen.getByRole("button"));

    expect(onCopy).toHaveBeenCalled();
  });

  it("says it has been copied once it has", () => {
    render(<CopyRow label="المبلغ" value="2100" copied onCopy={vi.fn()} />);

    expect(screen.getByText("تم")).toBeDefined();
    expect(screen.queryByText("نسخ")).toBeNull();
  });

  it("reads the value left to right, since it is a number to transcribe", () => {
    render(<CopyRow label="رقم المستلم" value="027217" copied={false} onCopy={vi.fn()} />);

    expect(screen.getByText("027217").getAttribute("dir")).toBe("ltr");
  });
});
