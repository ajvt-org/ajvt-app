"use client";

import ArrowLabel from "@/components/ArrowLabel";
import BackAffordance from "@/components/BackAffordance";

export default function AdminBackLink({ href, children }: { href: string; children: string }) {
  return (
    <BackAffordance href={href} className="text-sm font-bold" style={{ color: "var(--mint-600)" }}>
      <ArrowLabel direction="back">{children}</ArrowLabel>
    </BackAffordance>
  );
}
