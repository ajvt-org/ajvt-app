"use client";

import AttemptBreakdown, { type AttemptDetail } from "./AttemptBreakdown";
import ScoreActions from "./ScoreActions";
import { quizScores as texts } from "@/lib/texts";
import type { AttemptRow } from "./scoreTypes";

const VOIDED = "#991b1b";

export default function ScoreRow({
  row,
  detail,
  busy,
  canAct,
  onOpen,
  onClose,
  onReopen,
  onVoidRound,
  onVoidAll,
}: {
  row: AttemptRow;
  detail: AttemptDetail | null;
  busy: boolean;
  canAct: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReopen: () => void;
  onVoidRound: () => void;
  onVoidAll: () => void;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={onOpen}
        aria-expanded={detail !== null}
        aria-label={texts.openAttempt(row.name)}
        className="w-full flex items-center justify-between gap-2 rounded-lg p-2 text-xs text-start min-w-0"
        style={{ background: "var(--surface-2)", border: "1px solid var(--mint-100)" }}
      >
        <span className="truncate" style={{ color: "var(--text-main)" }}>
          {row.name}
          {row.voided && (
            <span className="font-bold" style={{ color: VOIDED }}>
              {" "}
              {texts.voidedMark}
            </span>
          )}
        </span>
        <span
          className="font-bold shrink-0"
          style={{ color: row.voided ? VOIDED : "var(--mint-700)" }}
        >
          {row.score}
        </span>
      </button>

      {detail && (
        <div className="rounded-lg p-2 space-y-2" style={{ border: "1px solid var(--mint-100)" }}>
          {canAct && (
            <ScoreActions
              row={row}
              busy={busy}
              onReopen={onReopen}
              onVoidRound={onVoidRound}
              onVoidAll={onVoidAll}
            />
          )}
          <AttemptBreakdown detail={detail} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
