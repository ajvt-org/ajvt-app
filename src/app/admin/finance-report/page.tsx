"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import { tagTotal, type TagRow } from "@/lib/financeReport";
import { financeReport as texts } from "@/lib/texts";

interface MonthRow {
  month: string;
  income: number;
  spending: number;
  net: number;
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
  return <Money value={value} style={{ color: value < 0 ? "var(--danger)" : undefined }} />;
}

function TagTable({ title, rows, total }: { title: string; rows: TagRow[]; total: number }) {
  if (rows.length === 0) return null;
  const tagged = tagTotal(rows);
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
        <tfoot>
          <tr style={{ color: "var(--text-muted)" }}>
            <td className="py-1">{texts.tagTotal}</td>
            <td className="py-1 text-left">
              <Amount value={tagged} />
            </td>
          </tr>
        </tfoot>
      </table>
      {tagged !== total && (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {texts.tagsOverlap}
        </p>
      )}
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
          <IconLabel name="chart">{texts.run}</IconLabel>
        </button>
        {report && (
          <button className="btn" onClick={() => window.print()}>
            <IconLabel name="file">{texts.print}</IconLabel>
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
              {texts.span(from, to)}
            </p>
            <p className="text-2xl font-bold mt-1">
              <Amount value={report.totals.net} />
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {texts.moneyDetail(report.totals.income, report.totals.spending)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {texts.splitDetail(report.totals.membershipFees, report.totals.support)}
            </p>
          </div>

          <div className="card p-4 overflow-x-auto">
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {texts.monthByMonth}
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {texts.amountsIn}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  <th className="text-right font-normal py-1">{texts.month}</th>
                  <th className="text-left font-normal py-1">{texts.income}</th>
                  <th className="text-left font-normal py-1">{texts.spending}</th>
                  <th className="text-left font-normal py-1">{texts.net}</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((row) => (
                  <tr key={row.month}>
                    <td className="py-1">{row.month}</td>
                    <td className="py-1 text-left">
                      <Money value={row.income} digitsOnly />
                    </td>
                    <td className="py-1 text-left">
                      <Money value={row.spending} digitsOnly />
                    </td>
                    <td className="py-1 text-left">
                      <Money
                        value={row.net}
                        digitsOnly
                        style={{ color: row.net < 0 ? "var(--danger)" : undefined }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TagTable
            title={texts.incomeByTag}
            rows={report.incomeByTag}
            total={report.totals.income}
          />
          <TagTable
            title={texts.spendingByTag}
            rows={report.spendingByTag}
            total={report.totals.spending}
          />
        </>
      )}
    </div>
  );
}
