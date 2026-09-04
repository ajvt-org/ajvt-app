"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Money from "@/components/Money";
import { NO_ACCOUNT, type MethodLedger } from "@/lib/accountLedger";
import { byAccount as texts } from "@/lib/texts";

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;

function Line({
  name,
  received,
  paid,
  muted,
  note,
}: {
  name: string;
  received: number;
  paid: number;
  muted?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-0.5">
      <span
        className="min-w-0 truncate"
        style={{ color: muted ? "var(--text-muted)" : "var(--text-main)" }}
      >
        <span dir="ltr" className="font-mono">
          {name}
        </span>
        {note && <span style={{ color: "var(--text-muted)" }}> {note}</span>}
      </span>
      <span className="flex items-center gap-3 shrink-0" style={NUMERIC}>
        <span className="font-bold" style={{ color: "var(--mint-600)" }}>
          <Money value={received} />
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          <Money value={paid} />
        </span>
      </span>
    </div>
  );
}

export default function ByAccount() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [methods, setMethods] = useState<MethodLedger[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    api
      .get<{ methods: MethodLedger[] }>(
        `/api/admin/finance/treasury/accounts${query ? `?${query}` : ""}`,
      )
      .then((data) => {
        setMethods(data.methods ?? []);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [from, to]);

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        {texts.title}
      </p>

      <div className="flex items-center gap-2">
        <input
          type="date"
          dir="ltr"
          aria-label={texts.from}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="input text-xs"
        />
        <input
          type="date"
          dir="ltr"
          aria-label={texts.to}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="input text-xs"
        />
      </div>

      <div
        className="flex items-center justify-end gap-3 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{texts.received}</span>
        <span>{texts.paid}</span>
      </div>

      {failed ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.failed}
        </p>
      ) : methods.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      ) : (
        <div className="space-y-2.5">
          {methods.map((ledger) => (
            <div key={ledger.method}>
              <div
                className="flex items-center justify-between gap-2 text-xs font-bold pb-1"
                style={{ borderBottom: "1px solid var(--mint-100)" }}
              >
                <span className="min-w-0 truncate" style={{ color: "var(--text-main)" }}>
                  {ledger.method}
                </span>
                <span className="flex items-center gap-3 shrink-0" style={NUMERIC}>
                  <span style={{ color: "var(--mint-700)" }}>
                    <Money value={ledger.received} />
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <Money value={ledger.paid} />
                  </span>
                </span>
              </div>
              <div className="ps-3">
                {ledger.accounts.map((account) => (
                  <Line
                    key={account.id}
                    name={account.id === NO_ACCOUNT ? texts.noAccount : (account.code ?? "")}
                    note={account.closed ? texts.closed : (account.label ?? undefined)}
                    muted={account.id === NO_ACCOUNT}
                    received={account.received}
                    paid={account.paid}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
