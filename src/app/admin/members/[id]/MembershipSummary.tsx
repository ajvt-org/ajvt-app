"use client";

import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import ProfileSection from "@/components/admin/ProfileSection";
import { membershipState, type StatefulMembership } from "@/lib/membershipState";
import { membershipSummary as texts } from "@/lib/texts";

export default function MembershipSummary({
  userId,
  membershipYear,
  status,
  endedAt,
  currentYear,
}: {
  userId: string;
  membershipYear: number;
  status: StatefulMembership["status"];
  endedAt: string | null;
  currentYear: number;
}) {
  const state = membershipState({ status, membershipYear, endedAt }, currentYear);

  return (
    <ProfileSection icon="card" title={texts.title}>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between gap-3">
          <dt style={{ color: "var(--text-muted)" }}>{texts.standing}</dt>
          <dd className="font-bold">{texts.states[state]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt style={{ color: "var(--text-muted)" }}>{texts.year}</dt>
          <dd className="font-bold" dir="ltr">
            {membershipYear}
          </dd>
        </div>
      </dl>

      <Link
        href={`/admin/payments?kind=MEMBERSHIP&focus=${userId}`}
        className="inline-flex text-xs font-bold px-3 py-2 rounded-lg mt-1"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <ArrowLabel>{texts.toPayment}</ArrowLabel>
      </Link>
    </ProfileSection>
  );
}
