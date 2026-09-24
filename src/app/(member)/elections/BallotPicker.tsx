"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { api, errorMessage } from "@/lib/api";
import { electionMember as texts } from "@/lib/texts";
import { BlankFace, CandidateFace, CheckSlot, rowLook } from "./BallotRow";
import type { MemberCandidate } from "./electionTypes";

const BLANK = "blank";

function Choice({
  selected,
  onPick,
  label,
  children,
}: {
  selected: boolean;
  onPick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={label}
      className="card p-3 w-full text-start flex items-center gap-3"
      style={rowLook(selected)}
    >
      <CheckSlot marked={selected} />
      {children}
    </button>
  );
}

export default function BallotPicker({
  electionId,
  candidates,
  allowBlank,
  onCast,
}: {
  electionId: string;
  candidates: MemberCandidate[];
  allowBlank: boolean;
  onCast: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = candidates.find((candidate) => candidate.id === picked) ?? null;

  async function cast() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/elections/${electionId}/vote`, {
        candidateId: picked === BLANK ? null : picked,
      });
      setConfirming(false);
      onCast();
    } catch (e) {
      setError(errorMessage(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {candidates.map((candidate) => (
          <Choice
            key={candidate.id}
            selected={picked === candidate.id}
            onPick={() => setPicked(candidate.id)}
            label={candidate.fullName}
          >
            <CandidateFace candidate={candidate} />
          </Choice>
        ))}

        {allowBlank && (
          <Choice
            selected={picked === BLANK}
            onPick={() => setPicked(BLANK)}
            label={texts.blankTitle}
          >
            <BlankFace />
          </Choice>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <button
        onClick={() => setConfirming(true)}
        disabled={picked === null || busy}
        className="btn btn-primary w-full disabled:opacity-40"
      >
        {texts.confirmVote}
      </button>

      {picked === null && (
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          {texts.pick}
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          title={texts.confirmTitle}
          message={
            <span className="space-y-2 block">
              <span className="block font-bold">
                {chosen ? texts.confirmFor(chosen.fullName) : texts.confirmBlank}
              </span>
              <span className="block" style={{ color: "var(--text-muted)" }}>
                {texts.cannotChange}
              </span>
            </span>
          }
          confirmLabel={texts.confirmVote}
          loading={busy}
          onConfirm={cast}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
