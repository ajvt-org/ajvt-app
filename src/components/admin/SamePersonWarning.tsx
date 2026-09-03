"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { memberStatusLabels } from "@/lib/messages";
import { samePerson as texts } from "@/lib/texts";
import { memberCardHref } from "@/lib/adminBackLink";
import { useAdminOrigin } from "@/components/admin/adminOrigin";

type SamePerson = {
  id: string;
  fullName: string;
  status: string;
  memberNumber: string | null;
  createdAt: string;
  accountPhone: string | null;
};

const STATUS: Record<string, string> = memberStatusLabels;

export default function SamePersonWarning({ memberId }: { memberId: string }) {
  const [answer, setAnswer] = useState<{ memberId: string; rows: SamePerson[] } | null>(null);
  const from = useAdminOrigin();

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
        <Icon name="warning" size={13} className="icon-inline" /> {texts.heading}
      </p>
      <p className="text-xs" style={{ color: "#92400e" }}>
        {texts.hint}
      </p>
      {others.map((other) => (
        <Link
          key={other.id}
          href={memberCardHref(other.id, from)}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="font-bold truncate" style={{ color: "var(--text-main)" }}>
            {other.fullName}
          </span>
          <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
            {STATUS[other.status] ?? other.status}
            {other.accountPhone ? ` · ${other.accountPhone}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}
