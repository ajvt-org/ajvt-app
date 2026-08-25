import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import Scoreline from "../Scoreline";
import { matchTone, type MatchTone } from "./tone";
import { matchDisplay } from "@/lib/texts";

export default function MatchMeta({
  time,
  round,
  venue,
  penalties = null,
  tone = "light",
  children,
}: {
  time?: string | null;
  round?: string | null;
  venue?: string | null;
  penalties?: { home: number; away: number } | null;
  tone?: MatchTone;
  children?: ReactNode;
}) {
  const color = matchTone[tone].meta;
  if (!time && !round && !venue && !penalties && !children) return null;

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap min-w-0" style={{ color }}>
      {time && <span dir="ltr">{time}</span>}
      {round && <span>{round}</span>}
      {venue && (
        <span className="inline-flex items-center gap-1">
          <Icon name="pin" size={12} />
          {venue}
        </span>
      )}
      {penalties && (
        <span className="inline-flex items-center gap-1">
          {matchDisplay.penalties}
          <Scoreline home={penalties.home} away={penalties.away} />
        </span>
      )}
      {children}
    </div>
  );
}
