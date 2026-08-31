import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { memberImportDialog } from "@/lib/texts";
import type { ImportedRow } from "@/lib/memberImportRun";
import MemberImportResult, { type ImportOutcome } from "./MemberImportResult";

function row(over: Partial<ImportedRow> = {}): ImportedRow {
  return {
    row: 1,
    outcome: "created",
    fullName: "محمد ولد أحمد",
    phone: "36000123",
    membership: false,
    ...over,
  };
}

function outcome(over: Partial<ImportOutcome> = {}): ImportOutcome {
  return {
    results: [row({ tempPassword: "123456" })],
    summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
    ...over,
  };
}

function setup(over: Partial<ImportOutcome> = {}) {
  const props = {
    outcome: outcome(over),
    onImportAnother: vi.fn(),
    onDone: vi.fn(),
  };
  render(<MemberImportResult {...props} />);
  return props;
}

function stubDownload() {
  const click = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:x"),
    revokeObjectURL: vi.fn(),
  });
  return click;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MemberImportResult", () => {
  it("counts what happened", () => {
    setup({ summary: { created: 3, updated: 2, skipped: 0, failed: 1 } });

    expect(screen.getByText(memberImportDialog.resultCreated(3))).toBeDefined();
    expect(screen.getByText(memberImportDialog.resultUpdated(2))).toBeDefined();
    expect(screen.getByText(memberImportDialog.resultFailed(1))).toBeDefined();
  });

  it("says plainly that the passwords are shown this once and offers the download", async () => {
    setup();

    expect(screen.getByText(memberImportDialog.passwordsOnce)).toBeDefined();

    const click = stubDownload();
    await userEvent.click(screen.getByText(memberImportDialog.passwordsDownload));

    expect(click).toHaveBeenCalled();
    expect(screen.getByText(memberImportDialog.passwordsSaved)).toBeDefined();
  });

  it("offers no password download when no row got one", () => {
    setup({ results: [row()] });

    expect(screen.queryByText(memberImportDialog.passwordsDownload)).toBeNull();
    expect(screen.queryByText(memberImportDialog.passwordsTitle)).toBeNull();
  });

  it("names every row that failed and why", () => {
    setup({
      results: [
        row({ tempPassword: "123456" }),
        row({ row: 2, outcome: "failed", fullName: "أحمد", error: "سبب الفشل" }),
      ],
      summary: { created: 1, updated: 0, skipped: 0, failed: 1 },
    });

    expect(screen.getByText(memberImportDialog.failedTitle)).toBeDefined();
    expect(screen.getByText("سبب الفشل")).toBeDefined();
    expect(screen.getByText(/أحمد/)).toBeDefined();
  });

  it("shows no failure list when every row went through", () => {
    setup();

    expect(screen.queryByText(memberImportDialog.failedTitle)).toBeNull();
  });

  it("offers another file and a way out", async () => {
    const props = setup();

    await userEvent.click(screen.getByText(memberImportDialog.importAnother));
    expect(props.onImportAnother).toHaveBeenCalled();

    await userEvent.click(screen.getByText(memberImportDialog.done));
    expect(props.onDone).toHaveBeenCalled();
  });
});
