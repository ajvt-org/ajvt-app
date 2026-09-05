"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { paymentAccountManager as texts } from "@/lib/texts";
import { counted } from "@/lib/arabicCount";
import { formatDate } from "@/lib/utils";
import { RECORD } from "@/lib/messages/counts";
import type { AdminAccountRow } from "@/lib/paymentMethodAdmin";

export default function PaymentAccountRow({
  account,
  methodId,
  busy,
  first,
  last,
  movable,
  onRun,
}: {
  account: AdminAccountRow;
  methodId: string;
  busy: boolean;
  first: boolean;
  last: boolean;
  movable: boolean;
  onRun: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState(account.label ?? "");
  const closed = account.closedAt !== null;

  const url = `/api/admin/payment-methods/${methodId}/accounts/${account.id}`;

  function patch(body: Record<string, unknown>) {
    return onRun(() => api.patch(url, body));
  }

  if (editing) {
    return (
      <li className="py-1.5 space-y-1.5" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={30}
          placeholder={texts.descriptionPlaceholder}
          className="input w-full"
          aria-label={texts.descriptionLabel}
        />
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await patch({ label: label.trim() });
              setEditing(false);
            }}
            className="btn btn-sm btn-ghost"
          >
            <IconLabel name="check">{texts.save}</IconLabel>
          </button>
          <button
            type="button"
            onClick={() => {
              setLabel(account.label ?? "");
              setEditing(false);
            }}
            className="btn btn-sm btn-ghost"
          >
            {texts.cancel}
          </button>
        </div>
      </li>
    );
  }

  if (replacing) {
    return (
      <li className="py-1.5 space-y-1.5" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.replaceWarning}
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={30}
          placeholder={texts.replaceLabel}
          className="input w-full"
          dir="ltr"
          aria-label={texts.replaceLabel}
        />
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={async () => {
              await onRun(() => api.post(`${url}/replace`, { code: code.trim() }));
              setCode("");
              setReplacing(false);
            }}
            className="btn btn-sm btn-ghost"
          >
            <IconLabel name="check">{texts.replace}</IconLabel>
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setReplacing(false);
            }}
            className="btn btn-sm btn-ghost"
          >
            {texts.cancel}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="py-1.5 space-y-1" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-sm shrink-0"
          dir="ltr"
          style={{ color: account.active && !closed ? "var(--text-main)" : "var(--text-muted)" }}
        >
          {account.code}
        </span>
        {account.label && (
          <span className="text-xs min-w-0 truncate" style={{ color: "var(--text-muted)" }}>
            {account.label}
          </span>
        )}
        <span className="flex-1" />
        {account.used > 0 && (
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            {counted(account.used, RECORD)}
          </span>
        )}
        {closed ? (
          <span className="badge shrink-0">
            {texts.closedOn(formatDate(account.closedAt ?? new Date()))}
          </span>
        ) : (
          !account.active && <span className="badge shrink-0">{texts.stopped}</span>
        )}
      </div>

      {!closed && (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={busy || first || !movable}
            onClick={() => patch({ move: "up" })}
            className="btn-icon"
            aria-label={texts.moveUp}
          >
            <Icon name="arrowUp" size={13} />
          </button>
          <button
            type="button"
            disabled={busy || last || !movable}
            onClick={() => patch({ move: "down" })}
            className="btn-icon"
            aria-label={texts.moveDown}
          >
            <Icon name="arrowDown" size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setLabel(account.label ?? "");
              setEditing(true);
            }}
            className="btn-icon"
            aria-label={texts.edit(account.code)}
          >
            <Icon name="pencil" size={13} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setReplacing(true)}
            className="btn btn-sm btn-ghost shrink-0"
          >
            {texts.replace}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ active: !account.active })}
            className="btn btn-sm btn-ghost shrink-0"
            aria-label={texts.toggle(account.code)}
          >
            {account.active ? texts.stop : texts.resume}
          </button>
        </div>
      )}
    </li>
  );
}
