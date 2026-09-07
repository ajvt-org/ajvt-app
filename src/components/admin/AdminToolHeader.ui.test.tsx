import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminToolHeader from "./AdminToolHeader";
import { adminTools } from "@/lib/texts";
import { TOOL_HREFS, toolAt } from "@/lib/toolLinks";

function precedes(first: HTMLElement, second: HTMLElement): boolean {
  return !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("the tool header", () => {
  it("names each tool from the registry rather than from a prop", () => {
    for (const href of TOOL_HREFS) {
      const { unmount } = render(<AdminToolHeader href={href} />);
      expect(screen.getByText(toolAt(href).label)).toBeDefined();
      unmount();
    }
  });

  it("puts the way back at the start of the row, before the title", () => {
    render(<AdminToolHeader href="/admin/broadcast" />);
    expect(
      precedes(
        screen.getByText(adminTools.backToTools),
        screen.getByText(toolAt("/admin/broadcast").label),
      ),
    ).toBe(true);
  });

  it("names the tools screen beside the arrow and links to it", () => {
    render(<AdminToolHeader href="/admin/deleted" />);
    const link = screen.getByText(adminTools.backToTools).closest("a");
    expect(link?.getAttribute("href")).toBe("/admin/tools");
  });

  it("keeps the note after the title and leaves it out when there is none", () => {
    const { unmount } = render(<AdminToolHeader href="/admin/audit-log" note="نتيجتان" />);
    expect(
      precedes(screen.getByText(toolAt("/admin/audit-log").label), screen.getByText("نتيجتان")),
    ).toBe(true);
    unmount();

    render(<AdminToolHeader href="/admin/audit-log" />);
    expect(screen.queryByText("نتيجتان")).toBeNull();
  });
});
