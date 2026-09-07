"use client";

import type { ReactNode } from "react";

export default function PaymentActions({
  children,
  danger,
}: {
  children: ReactNode;
  danger?: ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-x-4 gap-y-2 pt-2"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">{children}</div>
      {danger && <div className="shrink-0 flex flex-wrap items-center gap-2">{danger}</div>}
    </div>
  );
}
