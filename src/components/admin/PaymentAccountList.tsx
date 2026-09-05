"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { paymentAccountManager as texts } from "@/lib/texts";
import { openAccountRows, type AdminAccountRow } from "@/lib/paymentMethodAdmin";
import PaymentAccountRow from "./PaymentAccountRow";

export default function PaymentAccountList({
  methodId,
  accounts,
  busy,
  onRun,
}: {
  methodId: string;
  accounts: AdminAccountRow[];
  busy: boolean;
  onRun: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const open = openAccountRows(accounts);

  async function add(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!code.trim()) return;
    await onRun(async () => {
      await api.post(`/api/admin/payment-methods/${methodId}/accounts`, { code: code.trim() });
      setCode("");
    });
  }

  return (
    <div
      className="mt-1.5 ps-3 rounded-e-xl"
      style={{ borderInlineStart: "3px solid var(--mint-200)", background: "var(--mint-50)" }}
    >
      {accounts.length === 0 ? (
        <p className="text-xs py-1" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      ) : (
        <ul>
          {accounts.map((account) => (
            <PaymentAccountRow
              key={account.id}
              account={account}
              methodId={methodId}
              busy={busy}
              first={open[0]?.id === account.id}
              last={open[open.length - 1]?.id === account.id}
              movable={open.some((one) => one.id === account.id)}
              onRun={onRun}
            />
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex items-center gap-2 pt-1.5">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={30}
          placeholder={texts.newPlaceholder}
          className="input flex-1 min-w-0"
          dir="ltr"
          aria-label={texts.newLabel}
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn btn-sm btn-ghost">
          {texts.add}
        </button>
      </form>
    </div>
  );
}
