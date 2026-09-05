"use client";

import { stepPayment as texts } from "@/lib/texts";
import type { PayableAccount } from "@/lib/usePayableMethods";

export default function AccountChoice({
  accounts,
  value,
  onPick,
}: {
  accounts: PayableAccount[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="fade-up mt-4">
      <p
        id="member-account-label"
        className="block text-sm font-bold mb-2"
        style={{ color: "var(--text-main)" }}
      >
        {texts.accountLabel}
      </p>
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-labelledby="member-account-label"
      >
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            role="radio"
            aria-checked={value === account.id}
            aria-label={account.label ?? account.code}
            onClick={() => onPick(account.id)}
            className="py-3 rounded-xl text-sm font-bold transition-all border-2"
            style={{
              background: value === account.id ? "var(--mint-600)" : "white",
              color: value === account.id ? "white" : "var(--mint-700)",
              borderColor: value === account.id ? "var(--mint-600)" : "var(--mint-200)",
            }}
          >
            <span className="font-mono" dir="ltr">
              {account.code}
            </span>
            {account.label && <span className="block text-xs font-normal">{account.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
