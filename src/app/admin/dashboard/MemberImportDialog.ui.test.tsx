import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { validatePaidAmount } from "@/lib/donations";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { memberImportDialog } from "@/lib/texts";
import { money } from "@/lib/money";
import { members } from "@/lib/messages";
import MemberImportDialog, { type ImportPreview } from "./MemberImportDialog";
import { answering, isMethodsCall, methodsResponse } from "@tests/ui/paymentMethods";

const AGE = "البدريين";
const OTHER_AGE = "الإتحاد";
const METHOD = "بنكيلي";

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
    if (isMethodsCall(url)) return methodsResponse();
    return { ok: true, json: async () => (url.endsWith("/preview") ? body : outcome) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentImport(fetchMock: ReturnType<typeof mockPreview>) {
  const call = fetchMock.mock.calls.find(
    ([url]) => !url.endsWith("/preview") && !isMethodsCall(url),
  );
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
    const fetchMock = vi.fn(answering(async () => ({ ok: true, json: async () => ({}) })));
    vi.stubGlobal("fetch", fetchMock);
    setup();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "members.xlsx"), { applyAccept: false });

    expect(await screen.findByText(memberImportDialog.fileNotCsv)).toBeDefined();
    expect(fetchMock.mock.calls.filter(([url]) => !isMethodsCall(url))).toEqual([]);
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

    await userEvent.click(screen.getByText(memberImportDialog.bulk.selectMissingAgeGroup));
    expect(screen.getByText(memberImportDialog.bulk.selected(3))).toBeDefined();

    await userEvent.selectOptions(
      screen.getByLabelText(memberImportDialog.bulk.ageGroup),
      OTHER_AGE,
    );
    await userEvent.click(screen.getByText(memberImportDialog.bulk.apply));

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

  it("pays for the whole selection in one action", async () => {
    mockPreview(
      preview({
        rows: [1, 2, 3].map((row) => ({
          row,
          values: values(),
          issues: [],
          match: null,
        })),
      }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByText(memberImportDialog.bulk.selectAll));
    expect(screen.getByText(memberImportDialog.bulk.selected(3))).toBeDefined();

    await userEvent.selectOptions(screen.getByLabelText(memberImportDialog.bulk.method), METHOD);
    await userEvent.click(screen.getByText(memberImportDialog.bulk.apply));

    await waitFor(() =>
      expect(screen.getByLabelText(`${memberImportDialog.columnMethod} 1`)).toHaveProperty(
        "value",
        METHOD,
      ),
    );
    expect(screen.getByLabelText(`${memberImportDialog.columnAmount} 3`)).toHaveProperty(
      "value",
      "",
    );
    expect(screen.getByText(memberImportDialog.rowsReady(3))).toBeDefined();
  });

  it("leaves out a row whose person already holds a membership, and says so", async () => {
    mockPreview(
      preview({
        rows: [
          { row: 1, values: values(), issues: [], match: null },
          {
            row: 2,
            values: values(),
            issues: [],
            match: {
              kind: "name" as const,
              personId: "p2",
              fullName: "مطابق",
              hasMembership: true,
            },
          },
        ],
      }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByText(memberImportDialog.bulk.selectAll));

    expect(screen.getByText(memberImportDialog.bulk.selected(1))).toBeDefined();
    expect(screen.getByText(memberImportDialog.bulk.withMembership(1))).toBeDefined();
  });

  it("refuses an amount below the fee once, before it reaches any row", async () => {
    mockPreview(
      preview({ rows: [1, 2].map((row) => ({ row, values: values(), issues: [], match: null })) }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByText(memberImportDialog.bulk.selectAll));
    await userEvent.selectOptions(screen.getByLabelText(memberImportDialog.bulk.method), METHOD);
    await userEvent.type(screen.getByLabelText(memberImportDialog.bulk.amount), "50");
    await userEvent.click(screen.getByText(memberImportDialog.bulk.apply));

    expect(await screen.findByText(String(validatePaidAmount("50", 100)))).toBeDefined();
    expect(screen.queryByLabelText(`${memberImportDialog.columnMethod} 1`)).toBeNull();
    expect(screen.getByText(memberImportDialog.rowsReady(2))).toBeDefined();
  });

  it("names the surplus before an amount above the fee is applied to more than one", async () => {
    mockPreview(
      preview({ rows: [1, 2].map((row) => ({ row, values: values(), issues: [], match: null })) }),
    );
    setup();
    await upload();

    await userEvent.click(screen.getByText(memberImportDialog.bulk.selectAll));
    await userEvent.type(screen.getByLabelText(memberImportDialog.bulk.amount), "300");

    expect(screen.getByText(memberImportDialog.bulk.surplus(2, money(200)))).toBeDefined();

    await userEvent.click(screen.getAllByLabelText(memberImportDialog.selectRow)[0]);

    expect(screen.getByText(memberImportDialog.bulk.selected(1))).toBeDefined();
    expect(screen.queryByText(memberImportDialog.bulk.surplus(1, money(200)))).toBeNull();
  });

  it("says on the row that the matched person already holds a membership", async () => {
    mockPreview(
      preview({
        rows: [
          {
            row: 1,
            values: values(),
            issues: [],
            match: {
              kind: "name" as const,
              personId: "p1",
              fullName: "مطابق",
              hasMembership: true,
            },
          },
        ],
      }),
    );
    setup();
    await upload();

    expect(screen.getByText(memberImportDialog.matchHasMembership)).toBeDefined();
    expect(screen.getByLabelText(`${memberImportDialog.columnPaid} 1`)).toHaveProperty(
      "checked",
      false,
    );
  });

  it("says nothing about a membership when the matched person holds none", async () => {
    mockPreview(
      preview({
        rows: [
          {
            row: 1,
            values: values(),
            issues: [],
            match: {
              kind: "name" as const,
              personId: "p1",
              fullName: "مطابق",
              hasMembership: false,
            },
          },
        ],
      }),
    );
    setup();
    await upload();

    expect(screen.getByText(memberImportDialog.matchName("مطابق"))).toBeDefined();
    expect(screen.queryByText(memberImportDialog.matchHasMembership)).toBeNull();
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
