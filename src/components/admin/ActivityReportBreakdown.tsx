import Money from "@/components/Money";
import { activityReport as texts } from "@/lib/texts";
import type { ActivityReportRow } from "@/lib/activityReport";
import type { TagRow } from "@/lib/financeReport";

function TagList({ title, rows }: { title: string; rows: TagRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <ul className="text-sm space-y-0.5">
        {rows.map((row) => (
          <li key={row.tag} className="flex items-center justify-between gap-4">
            <span>{row.tag}</span>
            <Money value={row.amount} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ActivityReportBreakdown({ row }: { row: ActivityReportRow }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {row.title}
      </p>
      {row.activityId === null && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.generalNote}
        </p>
      )}

      <TagList title={texts.spendingByTag} rows={row.spendingByTag} />
      <TagList title={texts.incomeByTag} rows={row.incomeByTag} />

      <div>
        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
          {texts.receipts}
        </p>
        {row.receiptNumbers.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {texts.noReceipts}
          </p>
        ) : (
          <p className="text-sm" dir="ltr">
            {row.receiptNumbers.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
