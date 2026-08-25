import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import { formatMatchTime } from "@/lib/clubTime";
import type { PublicMatch } from "./publicTypes";

export default function MatchFixture({
  match,
  day,
}: {
  match: PublicMatch;
  day: { round: string | null; venue: string | null };
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      {match.matchDate && (
        <span className="fixture-time" dir="ltr">
          {formatMatchTime(match.matchDate)}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <MatchTeams
          home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
          away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
          size="sm"
        />
        <MatchMeta round={day.round ? null : match.round} venue={day.venue ? null : match.venue} />
      </div>
    </div>
  );
}
