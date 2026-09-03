import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ActivityReportTable from "./ActivityReportTable";
import { moneyDigits } from "@/lib/money";
import type { ActivityReportRow } from "@/lib/activityReport";

afterEach(cleanup);

const row = (over: Partial<ActivityReportRow> = {}): ActivityReportRow => ({
  activityId: "a1",
  title: "بطولة الصيف",
  income: 900,
  spending: 400,
  balance: 500,
  incomeByTag: [],
  spendingByTag: [],
  receiptNumbers: [],
  ...over,
});

describe("ActivityReportTable", () => {
  it("says so when the period holds no movement", () => {
    render(<ActivityReportTable rows={[]} totals={{ income: 0, spending: 0, balance: 0 }} />);

    expect(screen.getByText("لا حركة مالية في هذه الفترة")).toBeDefined();
  });

  it("gives every activity a row", () => {
    const { container } = render(
      <ActivityReportTable
        rows={[row(), row({ activityId: "a2", title: "القافلة الصحية" })]}
        totals={{ income: 1800, spending: 800, balance: 1000 }}
      />,
    );

    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("keys the row with no activity without colliding", () => {
    const { container } = render(
      <ActivityReportTable
        rows={[row(), row({ activityId: null, title: "بلا نشاط" })]}
        totals={{ income: 1800, spending: 800, balance: 1000 }}
      />,
    );

    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(screen.getByText("بلا نشاط")).toBeDefined();
  });

  it("names a surplus and a deficit", () => {
    render(
      <ActivityReportTable
        rows={[row(), row({ activityId: "a2", title: "القافلة", balance: -200 })]}
        totals={{ income: 900, spending: 600, balance: 300 }}
      />,
    );

    expect(screen.getByText("فائض")).toBeDefined();
    expect(screen.getByText("عجز")).toBeDefined();
  });

  it("carries the totals in the footer", () => {
    const { container } = render(
      <ActivityReportTable rows={[row()]} totals={{ income: 900, spending: 400, balance: 500 }} />,
    );

    expect(container.querySelector("tfoot")?.textContent).toContain(moneyDigits(500));
  });
});
