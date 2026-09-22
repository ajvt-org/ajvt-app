"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { electionMember as texts } from "@/lib/texts";
import type { MemberCandidate } from "./electionTypes";

export default function CandidateList({ candidates }: { candidates: MemberCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {texts.noCandidates}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {candidates.map((candidate) => (
        <div key={candidate.id} className="card p-3 flex items-center gap-3">
          <PlayerAvatar
            photoUrl={candidate.photo ? `/api/files/candidate/${candidate.photo}` : null}
            fullName={candidate.fullName}
            size={52}
          />
          <p className="activity-title min-w-0" style={{ color: "var(--text-main)" }}>
            {candidate.fullName}
          </p>
        </div>
      ))}
    </div>
  );
}
