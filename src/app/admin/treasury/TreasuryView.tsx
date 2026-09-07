"use client";

import { Fragment } from "react";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import type { MethodTotal, Treasury } from "@/lib/treasury";
import { treasury as texts } from "@/lib/texts";

type MoneyRow = { key: string; label: string; value: number; rule?: boolean };

function MoneyList({ rows }: { rows: MoneyRow[] }) {
  return (
    <div
      className="grid items-center gap-x-2 text-sm"
      style={{ gridTemplateColumns: "1fr auto auto" }}
    >
      {rows.map((row) => (
        <Fragment key={row.key}>
          {row.rule && (
            <span
              style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--mint-100)" }}
              aria-hidden="true"
            />
          )}
          <span className="optical-name py-1.5" style={{ color: "var(--text-muted)" }}>
            {row.label}
          </span>
          <Money
            value={row.value}
            digitsOnly
            className="font-bold optical-numeral py-1.5"
            style={{
              color: row.value < 0 ? "var(--danger)" : "var(--text-main)",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <span
            className="font-bold optical-name py-1.5"
            style={{ color: "var(--text-main)", textAlign: "right" }}
          >
            {texts.currency}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function MethodCard({
  heading,
  rows,
  empty,
}: {
  heading: string;
  rows: MethodTotal[];
  empty: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>
        <IconLabel name="banknote">{heading}</IconLabel>
      </p>
      {rows.length === 0 ? (
        <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
          {empty}
        </p>
      ) : (
        <MoneyList
          rows={rows.map((row) => ({ key: row.method, label: row.method, value: row.amount }))}
        />
      )}
    </div>
  );
}

export default function TreasuryView({ treasury }: { treasury: Treasury }) {
  return (
    <div className="px-5 py-5 space-y-4">
      <div
        className="card p-5 text-center"
        style={{ background: "linear-gradient(160deg, var(--mint-700), var(--mint-600))" }}
      >
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
          {texts.balance}
        </p>
        <p className="font-black text-white mt-1" style={{ fontSize: 30 }}>
          <Money value={treasury.balance} />
        </p>
      </div>

      <div className="card p-4">
        <MoneyList
          rows={[
            { key: "income", label: texts.income, value: treasury.income },
            { key: "fees", label: texts.fees, value: treasury.fees },
            { key: "support", label: texts.support, value: treasury.support },
            { key: "spending", label: texts.spending, value: treasury.spending, rule: true },
          ]}
        />
      </div>

      <MethodCard heading={texts.byMethod} rows={treasury.byMethod} empty={texts.noIncome} />

      <MethodCard
        heading={texts.spendingByMethod}
        rows={treasury.spendingByMethod}
        empty={texts.noSpending}
      />
    </div>
  );
}
