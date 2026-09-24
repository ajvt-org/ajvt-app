import Icon from "@/components/Icon";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { electionMember as texts } from "@/lib/texts";
import type { MemberCandidate } from "./electionTypes";

export function rowLook(marked: boolean) {
  return {
    border: marked ? "2px solid var(--mint-500)" : "2px solid transparent",
    background: marked ? "var(--mint-50)" : undefined,
  };
}

export function CheckSlot({ marked }: { marked: boolean }) {
  return (
    <span className="shrink-0 inline-flex" style={{ width: 20, color: "var(--mint-600)" }}>
      {marked && <Icon name="check" size={20} />}
    </span>
  );
}

export function CandidateFace({ candidate }: { candidate: MemberCandidate }) {
  return (
    <>
      <PlayerAvatar
        photoUrl={candidate.photo ? `/api/files/candidate/${candidate.photo}` : null}
        fullName={candidate.fullName}
        size={52}
      />
      <span className="activity-title min-w-0 flex-1" style={{ color: "var(--text-main)" }}>
        {candidate.fullName}
      </span>
    </>
  );
}

export function BlankFace() {
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-bold" style={{ color: "var(--text-main)" }}>
        {texts.blankTitle}
      </span>
      <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.blankSub}
      </span>
    </span>
  );
}
