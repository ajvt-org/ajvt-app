"use client";

import type { ReactNode } from "react";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { activityRegistrants as texts } from "@/lib/texts";

export interface IdentityPerson {
  fullName: string;
  phone: string | null;
  photo: string | null;
}

export default function PersonIdentity({
  person,
  detail,
}: {
  person: IdentityPerson;
  detail: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <PlayerAvatar photo={person.photo} fullName={person.fullName} size={32} />
      <div className="min-w-0 space-y-0.5 text-start">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-main)" }}>
          {person.fullName}
        </p>
        <p className="text-[11px] flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span dir="ltr">{person.phone || texts.unknownPhone}</span>
          {detail}
        </p>
      </div>
    </div>
  );
}
