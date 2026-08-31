"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import IconLabel from "@/components/IconLabel";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export default function RegistrantIdentity({ registration }: { registration: Registration }) {
  const { member, team } = registration;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <PlayerAvatar photo={member.photo} fullName={member.fullName} size={32} />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-main)" }}>
          {member.fullName}
        </p>
        <p className="text-[11px] flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span dir="ltr">{member.phone || texts.unknownPhone}</span>
          <IconLabel name="users" size={11}>
            {team ? team.name : texts.noTeam}
          </IconLabel>
        </p>
      </div>
    </div>
  );
}
