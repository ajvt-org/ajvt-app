"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { paymentAccountManager as accountTexts, paymentMethodManager as texts } from "@/lib/texts";
import { counted } from "@/lib/arabicCount";
import { RECORD } from "@/lib/messages/counts";
import { reachesNobody, type AdminMethodRow } from "@/lib/paymentMethodAdmin";
import PaymentAccountList from "./PaymentAccountList";

export default function PaymentMethodRow({
  method,
  busy,
  first,
  last,
  onRun,
}: {
  method: AdminMethodRow;
  busy: boolean;
  first: boolean;
  last: boolean;
  onRun: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(method.name);

  const url = `/api/admin/payment-methods/${method.id}`;

  function patch(body: Record<string, unknown>) {
    return onRun(() => api.patch(url, body));
  }

  if (editing) {
    return (
      <li
        className="flex items-center gap-2 py-1.5"
        style={{ borderTop: "1px solid var(--mint-100)" }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          className="input input-sm flex-1 min-w-0"
          aria-label={texts.renameLabel}
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={async () => {
            await patch({ name: name.trim() });
            setEditing(false);
          }}
          className="btn btn-sm btn-ghost"
        >
          <IconLabel name="check">{texts.save}</IconLabel>
        </button>
        <button
          type="button"
          onClick={() => {
            setName(method.name);
            setEditing(false);
          }}
          className="btn btn-sm btn-ghost"
        >
          {texts.cancel}
        </button>
      </li>
    );
  }

  return (
    <li className="py-2 space-y-1.5" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <div className="flex items-center gap-2">
        <span
          className="font-bold text-sm min-w-0 truncate"
          style={{ color: method.active ? "var(--text-main)" : "var(--text-muted)" }}
        >
          {method.name}
        </span>
        {method.used > 0 && (
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            {counted(method.used, RECORD)}
          </span>
        )}
        <span className="flex-1" />
        <span className="badge shrink-0">
          {method.memberFacing ? texts.memberFacing : texts.adminOnly}
        </span>
        {!method.active && <span className="badge shrink-0">{texts.stopped}</span>}
        {reachesNobody(method) && (
          <span className="badge shrink-0">{accountTexts.reachesNobody}</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={busy || first}
          onClick={() => patch({ move: "up" })}
          className="btn-icon"
          aria-label={texts.moveUp}
        >
          <Icon name="arrowUp" size={14} />
        </button>
        <button
          type="button"
          disabled={busy || last}
          onClick={() => patch({ move: "down" })}
          className="btn-icon"
          aria-label={texts.moveDown}
        >
          <Icon name="arrowDown" size={14} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ memberFacing: !method.memberFacing })}
          className="btn-icon"
          aria-label={texts.toggleMemberFacing(method.name)}
        >
          <Icon name={method.memberFacing ? "users" : "lock"} size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setName(method.name);
            setEditing(true);
          }}
          className="btn-icon"
          aria-label={texts.edit(method.name)}
        >
          <Icon name="pencil" size={14} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ active: !method.active })}
          className="btn btn-sm btn-ghost shrink-0"
          aria-label={texts.toggleActive(method.name)}
        >
          {method.active ? texts.stop : texts.resume}
        </button>
      </div>

      <PaymentAccountList
        methodId={method.id}
        accounts={method.accounts}
        busy={busy}
        onRun={onRun}
      />
    </li>
  );
}
