"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type SamePerson = {
  id: string;
  fullName: string;
  status: string;
  memberNumber: string | null;
  createdAt: string;
  accountPhone: string | null;
  matchedOn: "name" | "phone";
};

const STATUS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};

const WHY: Record<SamePerson["matchedOn"], string> = {
  name: "نفس الاسم",
  phone: "نفس الرقم",
};

// Sits above the decision. It says only what it can show — another membership
// under the same name or the same number, on a different account — and links
// to it, so "is this the same person applying twice?" is answered by looking
// rather than by remembering.
export default function SamePersonWarning({ memberId }: { memberId: string }) {
  // Kept next to the member it belongs to, so moving to the next request shows
  // nothing rather than the previous one's warning while its own is in the air.
  const [answer, setAnswer] = useState<{ memberId: string; rows: SamePerson[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${memberId}/same-person`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.others) setAnswer({ memberId, rows: data.others });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const others = answer && answer.memberId === memberId ? answer.rows : [];
  if (others.length === 0) return null;

  return (
    <div
      className="card p-3 space-y-2"
      style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}
    >
      <p className="text-xs font-bold" style={{ color: "#92400e" }}>
        <Icon name="warning" size={13} className="icon-inline" /> عضوية أخرى لنفس الشخص على حساب آخر
      </p>
      {others.map((other) => (
        <Link
          key={other.id}
          href={`/admin/members/${other.id}`}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="font-bold truncate" style={{ color: "var(--text-main)" }}>
            {other.fullName}
          </span>
          <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
            {WHY[other.matchedOn]} · {STATUS[other.status] ?? other.status}
            {other.accountPhone ? ` · ${other.accountPhone}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}
