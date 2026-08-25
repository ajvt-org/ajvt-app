import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchCardHead from "./matchCard/MatchCardHead";
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
    <div className="card p-3 space-y-1.5">
      <MatchCardHead time={match.matchDate ? formatMatchTime(match.matchDate) : null}>
        <MatchMeta round={day.round ? null : match.round} venue={day.venue ? null : match.venue} />
      </MatchCardHead>
      <MatchTeams
        home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
        away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
        size="sm"
        layout="stacked"
      />
    </div>
  );
}
