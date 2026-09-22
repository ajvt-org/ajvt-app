"use client";

import Icon from "@/components/Icon";
import { TileFrame } from "@/components/PhotoFrames";
import { SQUARE } from "@/components/admin/tournament/MatchCardActions";
import { ROW_ACTION_ICON } from "@/components/admin/tournament/TeamIdentityEditor";
import { electionCandidates as texts } from "@/lib/texts";
import type { ElectionCandidateRow } from "./electionTypes";

const PHOTO = 56;

export default function CandidateCard({
  candidate,
  frozen,
  busy,
  onEdit,
  onRemove,
}: {
  candidate: ElectionCandidateRow;
  frozen: boolean;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="card p-3 space-y-2" style={{ border: "1px solid var(--mint-300)" }}>
      <div className="flex items-center gap-3">
        <TileFrame
          displayUrl={candidate.photo ? `/api/files/candidate/${candidate.photo}` : null}
          label={candidate.fullName}
          action={candidate.fullName}
          uploading={false}
          locked
          placeholderIcon="user"
          size={PHOTO}
          onPick={() => {}}
        />
        <p className="activity-title min-w-0" style={{ color: "var(--text-main)" }}>
          {candidate.fullName}
        </p>
      </div>

      {!frozen && (
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            aria-label={texts.editOne(candidate.fullName)}
            className={SQUARE}
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="pencil" size={ROW_ACTION_ICON} />
          </button>
          <button
            onClick={onRemove}
            disabled={busy}
            aria-label={texts.removeOne(candidate.fullName)}
            className={SQUARE}
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="trash" size={ROW_ACTION_ICON} />
          </button>
        </div>
      )}
    </div>
  );
}
