"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import { formatDateTime } from "@/lib/clubTime";
import { proofCheck as texts, proofReuse } from "@/lib/texts";

export type CheckedRow = {
  kind: "member" | "donation" | "expense";
  id: string;
  label: string;
  date: string;
  amount: number | null;
  state: string | null;
  href: string;
};

const WHERE: Record<CheckedRow["kind"], string> = {
  member: proofReuse.member,
  donation: proofReuse.donation,
  expense: proofReuse.expense,
};

function stateOf(state: string | null): string | null {
  if (!state) return null;
  return state === "ACTIVE" ? texts.stateActive : texts.stateOther(state);
}

function Row({ row }: { row: CheckedRow }) {
  const state = stateOf(row.state);

  return (
    <Link
      href={row.href}
      className="card p-3 block space-y-1"
      style={{ color: "var(--text-main)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold min-w-0 truncate">
          {WHERE[row.kind]} {row.label}
        </span>
        {row.amount !== null && (
          <span className="text-sm font-bold shrink-0" style={{ color: "var(--mint-600)" }}>
            <Money value={row.amount} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ color: "var(--text-muted)" }}>
          <bdi dir="ltr">{formatDateTime(row.date)}</bdi>
          {state ? ` · ${state}` : ""}
        </span>
        <span className="shrink-0" style={{ color: "var(--mint-600)" }}>
          <IconLabel name="chevronLeft">{texts.open}</IconLabel>
        </span>
      </div>
    </Link>
  );
}

export default function ProofCheckResult({ rows }: { rows: CheckedRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-3 space-y-1">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="check">{texts.nothingTitle}</IconLabel>
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.nothingNote}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="card p-3 space-y-1"
        style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e" }}
      >
        <p className="text-sm font-bold">
          <Icon name="warning" size={13} className="icon-inline" /> {proofReuse.title}
        </p>
        <p className="text-xs">{texts.foundNote}</p>
      </div>
      {rows.map((row) => (
        <Row key={`${row.kind}-${row.id}`} row={row} />
      ))}
    </div>
  );
}
