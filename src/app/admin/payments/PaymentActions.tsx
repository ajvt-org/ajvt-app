"use client";

import type { ReactNode } from "react";

export default function PaymentActions({
  children,
  danger,
  stacked,
}: {
  children: ReactNode;
  danger?: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-x-4 gap-y-2 pt-2${stacked ? " flex-wrap" : ""}`}
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div
        className={`min-w-0 flex-1 flex flex-wrap items-center gap-2${stacked ? " basis-full" : ""}`}
      >
        {children}
      </div>
      {danger && (
        <div className={`shrink-0 flex flex-wrap items-center gap-2${stacked ? " ms-auto" : ""}`}>
          {danger}
        </div>
      )}
    </div>
  );
}
