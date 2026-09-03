import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ActivityReportBreakdown from "./ActivityReportBreakdown";
import type { ActivityReportRow } from "@/lib/activityReport";

afterEach(cleanup);

const row = (over: Partial<ActivityReportRow> = {}): ActivityReportRow => ({
  key: "a1",
  kind: "activity",
  title: "بطولة الصيف",
  income: 900,
  spending: 400,
  balance: 500,
  incomeByTag: [{ tag: "دعم", amount: 900 }],
  spendingByTag: [{ tag: "نقل", amount: 400 }],
  receiptNumbers: ["0001"],
  ...over,
});

describe("ActivityReportBreakdown", () => {
  it("splits the spending and the income by tag", () => {
    render(<ActivityReportBreakdown row={row()} />);

    expect(screen.getByText("نقل")).toBeDefined();
    expect(screen.getByText("دعم")).toBeDefined();
  });

  it("quotes the receipt numbers", () => {
    render(<ActivityReportBreakdown row={row({ receiptNumbers: ["0001", "0002"] })} />);

    expect(screen.getByText("0001 · 0002")).toBeDefined();
  });

  it("says when no numbered receipt was issued", () => {
    render(<ActivityReportBreakdown row={row({ receiptNumbers: [] })} />);

    expect(screen.getByText("لا وصولات مرقّمة في هذه الفترة")).toBeDefined();
  });

  it("explains what the row with no activity holds", () => {
    render(
      <ActivityReportBreakdown row={row({ key: "general", kind: "general", title: "بلا نشاط" })} />,
    );

    expect(screen.getByText(/رسوم الانتساب/)).toBeDefined();
  });

  it("leaves a tag list out when there is nothing under it", () => {
    render(<ActivityReportBreakdown row={row({ spendingByTag: [], incomeByTag: [] })} />);

    expect(screen.queryByText("الصرف حسب الوسم")).toBeNull();
  });
});
