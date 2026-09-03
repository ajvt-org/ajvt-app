"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ActivityReportTable from "@/components/admin/ActivityReportTable";
import ActivityReportBreakdown from "@/components/admin/ActivityReportBreakdown";
import { activityReport as texts } from "@/lib/texts";
import type { ActivityReportRow, ActivityReportTotals } from "@/lib/activityReport";

interface Report {
  from: string;
  to: string;
  rows: ActivityReportRow[];
  totals: ActivityReportTotals;
}

function startOfYear(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ActivityReportPage() {
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    try {
      setReport(await api.get<Report>(`/api/admin/finance/activities?from=${from}&to=${to}`));
    } catch (e) {
      setError(errorMessage(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="card p-4 no-print flex flex-wrap items-end gap-3">
        <label className="text-xs flex flex-col gap-1">
          {texts.from}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input"
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          {texts.to}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </label>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          <IconLabel name="list">{texts.run}</IconLabel>
        </button>
        {report && (
          <>
            <button className="btn" onClick={() => window.print()}>
              <IconLabel name="file">{texts.print}</IconLabel>
            </button>
            <a className="btn" href={`/api/admin/export/activities?from=${from}&to=${to}`}>
              <IconLabel name="download">{texts.exportCsv}</IconLabel>
            </a>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm no-print" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {report && (
        <>
          <div className="card p-4">
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {texts.span(from, to)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {texts.reconciles(report.totals.income, report.totals.spending)}
            </p>
          </div>

          <ActivityReportTable rows={report.rows} totals={report.totals} />

          {report.rows.map((row) => (
            <ActivityReportBreakdown key={row.key} row={row} />
          ))}
        </>
      )}
    </div>
  );
}
