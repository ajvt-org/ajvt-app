import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { memberImportDialog } from "@/lib/texts";
import { members } from "@/lib/messages";
import MemberImportDialog, { type ImportPreview } from "./MemberImportDialog";

const AGE = "البدريين";
const OTHER_AGE = "الإتحاد";

const ageGroups = [
  { id: "1", name: AGE },
  { id: "2", name: OTHER_AGE },
];

function values(over: Record<string, unknown> = {}) {
  return {
    fullName: "محمد ولد أحمد",
    phone: "",
    village: HOME_VILLAGE,
    age: AGE,
    paid: false,
    paymentMethod: "",
    paidAmount: "",
    ...over,
  };
}

function preview(over: Partial<ImportPreview> = {}): ImportPreview {
  return {
    batchId: "batch-1",
    fileHash: "hash",
    fileName: "members.csv",
    rows: [{ row: 1, values: values(), issues: [], match: null }],
    unknownColumns: [],
    villages: [HOME_VILLAGE, "بوغرابة", OTHER_VILLAGE],
    ageGroups: [AGE, OTHER_AGE],
    membershipFee: 100,
    paymentMethods: ["بنكيلي", "نقداً"],
    previousImport: null,
    ...over,
  };
}

const outcome = {
  results: [] as unknown[],
  summary: { created: 1, updated: 0, failed: 0, memberships: 0 },
};

function mockPreview(body: ImportPreview) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    void init;
    return { ok: true, json: async () => (url.endsWith("/preview") ? body : outcome) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentImport(fetchMock: ReturnType<typeof mockPreview>) {
  const call = fetchMock.mock.calls.find(([url]) => !url.endsWith("/preview"));
  if (!call) return null;
  return JSON.parse(String(call[1]?.body));
}

function setup(overrides: Partial<React.ComponentProps<typeof MemberImportDialog>> = {}) {
  const props = {
    ageGroups,
    onImported: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<MemberImportDialog {...props} />);
  return props;
}

function csv(name = "members.csv") {
  return new File(["الاسم الكامل\nمحمد ولد أحمد"], name, { type: "text/csv" });
}

async function upload(file = csv()) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input, file);
  await waitFor(() => expect(screen.getByText(memberImportDialog.columnRow)).toBeDefined());
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MemberImportDialog, the upload step", () => {
  it("offers the template before any file is chosen", () => {
    setup();

    expect(screen.getByText(memberImportDialog.downloadTemplate)).toBeDefined();
    expect(screen.queryByText(memberImportDialog.columnRow)).toBeNull();
  });

  it("refuses a file that is not a csv without asking the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "members.xlsx"), { applyAccept: false });

    expect(await screen.findByText(memberImportDialog.fileNotCsv)).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the rows once the file is read", async () => {
    mockPreview(preview());
    setup();
    await upload();

    expect(screen.getByLabelText(`${memberImportDialog.columnName} 1`)).toHaveProperty(
      "value",
      "محمد ولد أحمد",
    );
  });

  it("says when the same file went through before", async () => {
    mockPreview(
      preview({
        previousImport: { createdAt: "2026-08-01T10:00:00.000Z", createdBy: "another-admin" },
      }),
    );
    setup();
    await upload();

    expect(screen.getByText(/another-admin/)).toBeDefined();
  });

  it("names the columns it did not use", async () => {
    mockPreview(preview({ unknownColumns: ["ملاحظات"] }));
    setup();
    await upload();

    expect(screen.getByText(/ملاحظات/)).toBeDefined();
  });
});

describe("MemberImportDialog, a flagged row", () => {
  const flagged = () =>
    preview({
      rows: [
        {
          row: 1,
          values: values({ age: "" }),
          issues: [{ field: "age", message: members.pickAgeGroup, blocking: true }],
          match: null,
        },
      ],
    });

  it("will not import until the age group is chosen", async () => {
    const fetchMock = mockPreview(flagged());
    setup();
    await upload();

    const button = screen.getByRole("button", { name: memberImportDialog.importAll });
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText(memberImportDialog.importBlocked)).toBeDefined();

    await userEvent.selectOptions(screen.getByLabelText(`${memberImportDialog.columnAge} 1`), AGE);

    await waitFor(() => expect(button).toHaveProperty("disabled", false));
    await userEvent.click(button);
    await waitFor(() => expect(sentImport(fetchMock)).not.toBeNull());
  });

  it("fills the age group on every selected row in one action", async () => {
    mockPreview(
      preview({
        rows: [1, 2, 3].map((row) => ({
          row,
          values: values({ age: "" }),
          issues: [{ field: "age" as const, message: members.pickAgeGroup, blocking: true }],
          match: null,
        })),
      }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByText(memberImportDialog.bulkSelectAllBlocked));
    expect(screen.getByText(memberImportDialog.bulkSelected(3))).toBeDefined();

    await userEvent.selectOptions(
      screen.getByLabelText(memberImportDialog.bulkAgeGroup),
      OTHER_AGE,
    );
    await userEvent.click(screen.getByText(memberImportDialog.bulkApply));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: memberImportDialog.importAll })).toHaveProperty(
        "disabled",
        false,
      ),
    );
    expect(screen.getByLabelText(`${memberImportDialog.columnAge} 2`)).toHaveProperty(
      "value",
      OTHER_AGE,
    );
  });

  it("flags a row again when an edit breaks it", async () => {
    mockPreview(preview());
    setup();
    await upload();

    await userEvent.clear(screen.getByLabelText(`${memberImportDialog.columnName} 1`));

    expect(await screen.findByText(members.fullNameRequired)).toBeDefined();
    expect(screen.getByRole("button", { name: memberImportDialog.importAll })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("MemberImportDialog, what gets sent", () => {
  it("leaves out a skipped row and carries the matched account of the rest", async () => {
    const fetchMock = mockPreview(
      preview({
        rows: [
          { row: 1, values: values(), issues: [], match: null },
          {
            row: 2,
            values: values({ fullName: "أحمد", phone: "36000123" }),
            issues: [],
            match: { kind: "phone", personId: "p1", fullName: "أحمد", hasMembership: false },
          },
        ],
      }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByRole("button", { name: `${memberImportDialog.skipRow} 2` }));
    await userEvent.click(screen.getByRole("button", { name: `${memberImportDialog.skipRow} 1` }));
    await userEvent.click(screen.getByRole("button", { name: memberImportDialog.importAll }));

    await waitFor(() =>
      expect(sentImport(fetchMock)).toMatchObject({
        batchId: "batch-1",
        rows: [{ row: 2, personId: "p1" }],
      }),
    );
  });

  it("starts a row matching an existing account on skip", async () => {
    mockPreview(
      preview({
        rows: [
          {
            row: 1,
            values: values({ phone: "36000123" }),
            issues: [],
            match: { kind: "phone", personId: "p1", fullName: "محمد", hasMembership: false },
          },
        ],
      }),
    );
    setup();
    await upload();

    expect(screen.getByText(memberImportDialog.rowsSkipped(1))).toBeDefined();
    expect(screen.getByRole("button", { name: memberImportDialog.importAll })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("drops the age group when the row moves to a village that does not use one", async () => {
    const fetchMock = mockPreview(preview());
    setup();
    await upload();

    await userEvent.selectOptions(
      screen.getByLabelText(`${memberImportDialog.columnVillage} 1`),
      OTHER_VILLAGE,
    );
    await userEvent.click(screen.getByRole("button", { name: memberImportDialog.importAll }));

    await waitFor(() =>
      expect(sentImport(fetchMock)).toMatchObject({ rows: [{ values: { age: "" } }] }),
    );
  });
});
