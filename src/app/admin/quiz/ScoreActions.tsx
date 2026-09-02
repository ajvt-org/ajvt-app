"use client";

import IconLabel from "@/components/IconLabel";
import { quizScores as texts } from "@/lib/texts";
import type { AttemptRow } from "./scoreTypes";

const QUIET = { background: "var(--mint-100)", color: "var(--mint-700)" };
const DANGER = { background: "#fee2e2", color: "#991b1b" };
const UNDO = { background: "var(--mint-600)", color: "#fff" };

function Action({
  busy,
  tone,
  label,
  onClick,
  children,
}: {
  busy: boolean;
  tone: React.CSSProperties;
  label?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className="text-xs rounded-lg px-3 py-1.5 font-bold whitespace-nowrap disabled:opacity-50"
      style={tone}
    >
      {children}
    </button>
  );
}

export default function ScoreActions({
  row,
  busy,
  onReopen,
  onVoidRound,
  onVoidAll,
}: {
  row: AttemptRow;
  busy: boolean;
  onReopen: () => void;
  onVoidRound: () => void;
  onVoidAll: () => void;
}) {
  const undo = row.voided ? texts.restore : texts.void;
  const tone = row.voided ? UNDO : DANGER;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Action busy={busy} tone={QUIET} label={texts.reopenTitle} onClick={onReopen}>
        <IconLabel name="refresh">{texts.reopen}</IconLabel>
      </Action>

      <span className="flex items-center gap-2 ms-auto ps-2">
        <Action
          busy={busy}
          tone={tone}
          label={texts.roundPoints(undo, row.name)}
          onClick={onVoidRound}
        >
          <IconLabel name="ban">{`${undo} ${texts.thisRound}`}</IconLabel>
        </Action>
        <Action
          busy={busy}
          tone={tone}
          label={texts.allRoundsPoints(undo, row.name)}
          onClick={onVoidAll}
        >
          {`${undo} ${texts.allRounds}`}
        </Action>
      </span>
    </div>
  );
}
