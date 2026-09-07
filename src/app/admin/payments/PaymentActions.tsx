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
      className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {danger && <div className="flex flex-wrap items-center gap-2 ms-auto">{danger}</div>}
    </div>
  );
}
