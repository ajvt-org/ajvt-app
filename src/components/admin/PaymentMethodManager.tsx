"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { paymentMethodManager as texts } from "@/lib/texts";
import type { AdminMethodRow } from "@/lib/paymentMethodAdmin";
import MethodRow from "./PaymentMethodRow";

export default function PaymentMethodManager() {
  const [methods, setMethods] = useState<AdminMethodRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    return api
      .get<{ methods: AdminMethodRow[] }>("/api/admin/payment-methods")
      .then((data) => setMethods(data.methods ?? []))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError("");
      try {
        await action();
        await refresh();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  async function create(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!name.trim()) return;
    await run(async () => {
      await api.post("/api/admin/payment-methods", { name: name.trim(), memberFacing: false });
      setName("");
    });
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="font-black text-sm" style={{ color: "var(--text-main)" }}>
        <IconLabel name="card">{texts.title}</IconLabel>
      </p>

      <form onSubmit={create} className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder={texts.newPlaceholder}
          className="input input-sm flex-1 min-w-0"
          aria-label={texts.newLabel}
        />
        <button type="submit" disabled={busy || !name.trim()} className="btn btn-sm btn-ghost">
          <IconLabel name="plus">{texts.add}</IconLabel>
        </button>
      </form>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {methods.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {methods.map((method, at) => (
            <MethodRow
              key={method.id}
              method={method}
              busy={busy}
              first={at === 0}
              last={at === methods.length - 1}
              onRun={run}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
