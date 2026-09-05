"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { memberPicker } from "@/lib/texts";
import { DETAIL_SEPARATOR, personDetails } from "@/lib/personDetails";
import type { MemberOption } from "./paymentTypes";

export function identityText(member: MemberOption): string {
  return [member.fullName, member.memberNumber, member.phone, member.village, member.age]
    .filter(Boolean)
    .join(" ");
}

export default function MemberIdentity({
  member,
  size = 30,
  showName = true,
}: {
  member: MemberOption;
  size?: number;
  showName?: boolean;
}) {
  const details = personDetails(member);

  return (
    <span className="flex items-center gap-2 min-w-0">
      <PlayerAvatar photo={member.photo} fullName={member.fullName} size={size} />
      <span className="min-w-0 flex-1 text-right">
        {showName && (
          <span className="block truncate font-semibold" style={{ color: "var(--text-main)" }}>
            {member.fullName}
          </span>
        )}
        <span className="block truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
          <bdi>{member.memberNumber || memberPicker.noNumber}</bdi>
          {details && DETAIL_SEPARATOR}
          <bdi>{details}</bdi>
        </span>
      </span>
    </span>
  );
}
