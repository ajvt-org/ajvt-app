"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import ProfileSection from "@/components/admin/ProfileSection";
import { membershipState, type StatefulMembership } from "@/lib/membershipState";
import { membershipSummary as texts } from "@/lib/texts";
import type { MemberProfile } from "@/components/admin/profileTypes";
import MembershipPaymentDialog from "./MembershipPaymentDialog";

export default function MembershipSummary({
  member,
  currentYear,
  onChanged,
}: {
  member: MemberProfile["member"];
  currentYear: number;
  onChanged: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const state = membershipState(
    {
      status: member.status as StatefulMembership["status"],
      membershipYear: member.membershipYear,
      endedAt: member.endedAt,
    },
    currentYear,
  );

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
            {member.membershipYear}
          </dd>
        </div>
      </dl>

      <button
        onClick={() => setOpening(true)}
        className="btn btn-sm font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="card">{texts.toPayment}</IconLabel>
      </button>

      {opening && (
        <MembershipPaymentDialog
          member={member}
          currentYear={currentYear}
          onChanged={onChanged}
          onClose={() => setOpening(false)}
        />
      )}
    </ProfileSection>
  );
}
