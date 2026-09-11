"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ProfileSection from "@/components/admin/ProfileSection";
import { membershipState, type StatefulMembership } from "@/lib/membershipState";
import { membershipSummary as texts } from "@/lib/texts";
import type { MemberProfile } from "@/components/admin/profileTypes";
import MembershipEnding, { EndedRows } from "./MembershipEnding";
import MembershipPaymentDialog from "./MembershipPaymentDialog";
import MembershipYears from "./MembershipYears";
import RenewForm from "./RenewForm";
import type { MembershipHistory } from "./membershipTypes";

function fetchHistory(memberId: string): Promise<MembershipHistory | null> {
  return api.get<MembershipHistory>(`/api/admin/members/${memberId}/memberships`).catch(() => null);
}

export default function MembershipCard({
  member,
  currentYear,
  onChanged,
}: {
  member: MemberProfile["member"];
  currentYear: number;
  onChanged: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [history, setHistory] = useState<MembershipHistory | null>(null);

  const reload = useCallback(() => fetchHistory(member.id).then(setHistory), [member.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  function refresh() {
    onChanged();
    return reload();
  }

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
        {member.endedAt && (
          <EndedRows
            endedAt={member.endedAt}
            endedReason={member.endedReason}
            endedBy={member.endedBy}
          />
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpening(true)} className="btn btn-sm btn-ghost font-bold">
          <IconLabel name="card">{texts.toPayment}</IconLabel>
        </button>

        {member.status === "ACTIVE" && (
          <MembershipEnding
            memberId={member.id}
            memberName={member.fullName}
            year={member.membershipYear}
            ending={
              member.endedAt
                ? {
                    endedAt: member.endedAt,
                    endedReason: member.endedReason,
                    endedBy: member.endedBy,
                  }
                : null
            }
            onChanged={refresh}
          />
        )}
      </div>

      {history && <MembershipYears years={history.memberships} currentYear={history.currentYear} />}

      {history && !history.refusal && (
        <RenewForm memberId={member.id} year={history.currentYear} onRenewed={refresh} />
      )}

      {opening && (
        <MembershipPaymentDialog
          member={member}
          currentYear={currentYear}
          onChanged={refresh}
          onClose={() => setOpening(false)}
        />
      )}
    </ProfileSection>
  );
}
