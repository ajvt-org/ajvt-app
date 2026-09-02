import Scoreline from "@/components/tournament/Scoreline";
import { matchOutcome, type ScoredMatch } from "@/lib/matchOutcome";
import { daysTab as texts, matchDisplay } from "@/lib/texts";

export default function DayMatchResult({ match }: { match: ScoredMatch }) {
  if (match.status !== "PLAYED") return null;

  const outcome = matchOutcome(match);
  if (!outcome) return <span className="badge badge-active text-xs">{texts.finished}</span>;

  return (
    <span className="flex items-center gap-2 flex-wrap">
      <Scoreline
        home={outcome.home}
        away={outcome.away}
        className="badge badge-active font-black"
      />
      {outcome.forfeit && (
        <span className="badge badge-pending text-xs">{matchDisplay.forfeitBadge}</span>
      )}
      {outcome.penalties && (
        <span
          className="text-xs inline-flex items-center gap-1"
          style={{ color: "var(--text-muted)" }}
        >
          {matchDisplay.penalties}
          <Scoreline home={outcome.penalties.home} away={outcome.penalties.away} />
        </span>
      )}
    </span>
  );
}
