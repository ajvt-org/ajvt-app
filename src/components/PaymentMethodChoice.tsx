"use client";

import { paymentMethodChoice as texts } from "@/lib/texts";
import type { PayableMethods } from "@/lib/usePayableMethods";

const CHOICES = "grid grid-cols-3 gap-2";

function Waiting() {
  return (
    <div className={`${CHOICES} pulse`} aria-hidden="true">
      {[0, 1, 2].map((slot) => (
        <span
          key={slot}
          className="rounded-xl border-2"
          style={{ height: 46, background: "var(--mint-100)", borderColor: "var(--mint-200)" }}
        />
      ))}
    </div>
  );
}

function Notice({ children }: { children: string }) {
  return (
    <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

export default function PaymentMethodChoice({
  offer,
  value,
  onPick,
  labelledBy,
}: {
  offer: PayableMethods;
  value: string;
  onPick: (name: string) => void;
  labelledBy: string;
}) {
  if (offer.loading) return <Waiting />;
  if (offer.failed) return <Notice>{texts.failed}</Notice>;
  if (offer.methods.length === 0) return <Notice>{texts.none}</Notice>;

  return (
    <div className={CHOICES} role="radiogroup" aria-labelledby={labelledBy}>
      {offer.methods.map(({ name }) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          onClick={() => onPick(name)}
          className="py-3 rounded-xl text-sm font-bold transition-all border-2"
          style={{
            background: value === name ? "var(--mint-600)" : "white",
            color: value === name ? "white" : "var(--mint-700)",
            borderColor: value === name ? "var(--mint-600)" : "var(--mint-200)",
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
