import { activityReport as texts } from "@/lib/texts";
import type { ActivityReportRow, ActivityReportTotals } from "@/lib/activityReport";

function stateOf(balance: number): string {
  if (balance > 0) return texts.surplus;
  if (balance < 0) return texts.deficit;
  return texts.even;
}

function Amount({ value }: { value: number }) {
  return (
    <span style={{ color: value < 0 ? "var(--danger)" : undefined }}>{texts.ouguiya(value)}</span>
  );
}

export default function ActivityReportTable({
  rows,
  totals,
}: {
  rows: ActivityReportRow[];
  totals: ActivityReportTotals;
}) {
  if (rows.length === 0) {
    return (
      <div className="card p-4">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="text-right font-normal py-1">{texts.activity}</th>
            <th className="text-left font-normal py-1">{texts.income}</th>
            <th className="text-left font-normal py-1">{texts.spending}</th>
            <th className="text-left font-normal py-1">{texts.balance}</th>
            <th className="text-left font-normal py-1">{texts.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.activityId ?? "general"}>
              <td className="py-1">{row.title}</td>
              <td className="py-1 text-left">{row.income}</td>
              <td className="py-1 text-left">{row.spending}</td>
              <td className="py-1 text-left">
                <Amount value={row.balance} />
              </td>
              <td className="py-1 text-left" style={{ color: "var(--text-muted)" }}>
                {stateOf(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="py-1">{texts.total}</td>
            <td className="py-1 text-left">{totals.income}</td>
            <td className="py-1 text-left">{totals.spending}</td>
            <td className="py-1 text-left">
              <Amount value={totals.balance} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
