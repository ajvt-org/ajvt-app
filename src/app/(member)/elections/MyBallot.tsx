"use client";

import Icon from "@/components/Icon";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { electionMember as texts } from "@/lib/texts";
import type { MemberCandidate } from "./electionTypes";

export default function MyBallot({ candidate }: { candidate: MemberCandidate | null }) {
  return (
    <div className="card p-4 space-y-3" style={{ border: "2px solid var(--mint-500)" }}>
      <p className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--mint-700)" }}>
        <Icon name="check" size={18} />
        {texts.recorded}
      </p>

      <div className="flex items-center gap-3">
        {candidate && (
          <PlayerAvatar
            photoUrl={candidate.photo ? `/api/files/candidate/${candidate.photo}` : null}
            fullName={candidate.fullName}
            size={52}
          />
        )}
        <p className="activity-title min-w-0" style={{ color: "var(--text-main)" }}>
          {candidate ? texts.recordedFor(candidate.fullName) : texts.recordedBlank}
        </p>
      </div>
    </div>
  );
}
