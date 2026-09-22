import { electionState } from "@/lib/election";
import { electionStateLabels } from "@/lib/texts";

const TONE = {
  hidden: { background: "var(--surface-2)", color: "var(--text-muted)" },
  upcoming: { background: "var(--mint-100)", color: "var(--mint-700)" },
  open: { background: "var(--mint-500)", color: "white" },
  ended: { background: "var(--surface-2)", color: "var(--text-main)" },
} as const;

export function chipKey(election: {
  hidden: boolean;
  startsAt: string;
  durationMinutes: number;
}): keyof typeof TONE {
  return election.hidden ? "hidden" : electionState(election);
}

export default function ElectionStateChip({
  election,
}: {
  election: { hidden: boolean; startsAt: string; durationMinutes: number };
}) {
  const key = chipKey(election);

  return (
    <span className="badge text-xs font-bold" style={TONE[key]}>
      {electionStateLabels[key]}
    </span>
  );
}
