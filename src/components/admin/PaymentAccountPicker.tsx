"use client";

import { paymentAccountPicker as texts } from "@/lib/texts";
import { withHeldAccount, type PaymentAccountChoice } from "@/lib/paymentMethodChoices";

export default function PaymentAccountPicker({
  accounts,
  value,
  held,
  label,
  onPick,
  style,
}: {
  accounts: PaymentAccountChoice[];
  value: string;
  held?: PaymentAccountChoice | null;
  label?: string;
  onPick: (accountId: string) => void;
  style?: React.CSSProperties;
}) {
  const offered = withHeldAccount(accounts, held);
  if (offered.length === 0) return null;

  return (
    <select
      aria-label={label ?? texts.label}
      value={value}
      onChange={(e) => onPick(e.target.value)}
      className="input"
      style={style}
    >
      <option value="">{texts.unknown}</option>
      {offered.map((account) => (
        <option key={account.id} value={account.id}>
          {account.label ? `${account.code} — ${account.label}` : account.code}
        </option>
      ))}
    </select>
  );
}
