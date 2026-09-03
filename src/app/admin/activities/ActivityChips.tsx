"use client";

import Icon from "@/components/Icon";
import { activityRow as texts } from "@/lib/texts";

export type ChipRole = "waiting" | "status" | "category";

const STYLE: Record<ChipRole, React.CSSProperties> = {
  waiting: { background: "#f59e0b", color: "#1f1300" },
  status: { background: "white", color: "var(--text-muted)", border: "1px solid var(--mint-200)" },
  category: { background: "var(--mint-100)", color: "var(--mint-700)" },
};

export function Chip({ text, role }: { text: string; role: ChipRole }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-lg font-bold shrink-0 flex items-center gap-1"
      style={STYLE[role]}
    >
      {role === "waiting" && <Icon name="bell" size={11} />}
      {text}
    </span>
  );
}

export function WaitingChips({ pending, joins }: { pending: number; joins: number }) {
  return (
    <>
      {pending > 0 && <Chip text={texts.pendingChip(pending)} role="waiting" />}
      {joins > 0 && <Chip text={texts.joinRequestChip(joins)} role="waiting" />}
    </>
  );
}

export function StatusChips({ published, isOpen }: { published: boolean; isOpen: boolean }) {
  return (
    <>
      {!published && <Chip text={texts.draftChip} role="status" />}
      {!isOpen && <Chip text={texts.closedChip} role="status" />}
    </>
  );
}

export function CategoryChip({
  isTournament,
  isVolunteer,
}: {
  isTournament: boolean;
  isVolunteer: boolean;
}) {
  if (isTournament) return <Chip text={texts.tournamentChip} role="category" />;
  if (isVolunteer) return <Chip text={texts.volunteerChip} role="category" />;
  return null;
}
