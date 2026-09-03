import Money from "@/components/Money";
import { activityReport as texts } from "@/lib/texts";
import type { ActivityReportRow, ActivityReportTotals } from "@/lib/activityReport";

function stateOf(balance: number): string {
  if (balance > 0) return texts.surplus;
  if (balance < 0) return texts.deficit;
  return texts.even;
}

function Amount({ value }: { value: number }) {
  return (
    <Money value={value} digitsOnly style={{ color: value < 0 ? "var(--danger)" : undefined }} />
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
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {texts.amountsIn}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="text-right font-normal py-1 px-1">{texts.activity}</th>
            <th className="text-left font-normal py-1 px-1 whitespace-nowrap">{texts.income}</th>
            <th className="text-left font-normal py-1 px-1 whitespace-nowrap">{texts.spending}</th>
            <th className="text-left font-normal py-1 px-1 whitespace-nowrap">{texts.balance}</th>
            <th className="text-left font-normal py-1 px-1 whitespace-nowrap">{texts.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="py-1 px-1">{row.title}</td>
              <td className="py-1 px-1 text-left whitespace-nowrap">
                <Money value={row.income} digitsOnly />
              </td>
              <td className="py-1 px-1 text-left whitespace-nowrap">
                <Money value={row.spending} digitsOnly />
              </td>
              <td className="py-1 px-1 text-left whitespace-nowrap">
                <Amount value={row.balance} />
              </td>
              <td
                className="py-1 px-1 text-left whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                {stateOf(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="py-1 px-1">{texts.total}</td>
            <td className="py-1 px-1 text-left whitespace-nowrap">
              <Money value={totals.income} digitsOnly />
            </td>
            <td className="py-1 px-1 text-left whitespace-nowrap">
              <Money value={totals.spending} digitsOnly />
            </td>
            <td className="py-1 px-1 text-left whitespace-nowrap">
              <Amount value={totals.balance} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
