"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";

interface MonthRow {
  month: string;
  income: number;
  spending: number;
  net: number;
}

interface TagRow {
  tag: string;
  amount: number;
}

interface Report {
  from: string;
  to: string;
  months: MonthRow[];
  incomeByTag: TagRow[];
  spendingByTag: TagRow[];
  totals: {
    income: number;
    spending: number;
    net: number;
    membershipFees: number;
    support: number;
  };
}

function startOfYear(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Amount({ value }: { value: number }) {
  return <span style={{ color: value < 0 ? "var(--danger)" : undefined }}>{value} أوقية</span>;
}

function TagTable({ title, rows }: { title: string; rows: TagRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card p-4">
      <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
        {title}
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.tag}>
              <td className="py-1">{row.tag}</td>
              <td className="py-1 text-left">
                <Amount value={row.amount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinanceReportPage() {
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    try {
      setReport(await api.get<Report>(`/api/admin/finance/report?from=${from}&to=${to}`));
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
          من
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input"
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          إلى
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </label>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          <IconLabel name="chart">اعرض التقرير</IconLabel>
        </button>
        {report && (
          <button className="btn" onClick={() => window.print()}>
            <IconLabel name="file">اطبع</IconLabel>
          </button>
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
              من {from} إلى {to}
            </p>
            <p className="text-2xl font-bold mt-1">
              <Amount value={report.totals.net} />
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              دخل {report.totals.income} أوقية، صرف {report.totals.spending} أوقية
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              انتساب {report.totals.membershipFees} أوقية، دعم {report.totals.support} أوقية
            </p>
          </div>

          <div className="card p-4">
            <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
              شهراً بشهر
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  <th className="text-right font-normal py-1">الشهر</th>
                  <th className="text-left font-normal py-1">دخل</th>
                  <th className="text-left font-normal py-1">صرف</th>
                  <th className="text-left font-normal py-1">الصافي</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((row) => (
                  <tr key={row.month}>
                    <td className="py-1">{row.month}</td>
                    <td className="py-1 text-left">{row.income}</td>
                    <td className="py-1 text-left">{row.spending}</td>
                    <td className="py-1 text-left">
                      <Amount value={row.net} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TagTable title="الدخل حسب الوسم" rows={report.incomeByTag} />
          <TagTable title="الصرف حسب الوسم" rows={report.spendingByTag} />
        </>
      )}
    </div>
  );
}
