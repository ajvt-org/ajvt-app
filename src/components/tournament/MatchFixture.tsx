import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchCardHead from "./matchCard/MatchCardHead";
import { formatMatchTime } from "@/lib/clubTime";
import { teamName } from "@/lib/fixtureTeams";
import type { PublicMatch } from "./publicTypes";
import type { EntrantKind } from "@/lib/entrant";

export default function MatchFixture({
  match,
  day,
  entrant = "team",
}: {
  match: PublicMatch;
  day: { round: string | null; venue: string | null };
  entrant?: EntrantKind;
}) {
  return (
    <div className="card p-3 space-y-1.5">
      <MatchCardHead time={match.matchDate ? formatMatchTime(match.matchDate) : null}>
        <MatchMeta round={day.round ? null : match.round} venue={day.venue ? null : match.venue} />
      </MatchCardHead>
      <MatchTeams
        home={{
          name: teamName(match.homeTeam),
          logo: match.homeTeam?.logo,
          photo: match.homeTeam?.photo,
        }}
        away={{
          name: teamName(match.awayTeam),
          logo: match.awayTeam?.logo,
          photo: match.awayTeam?.photo,
        }}
        size="sm"
        layout="stacked"
        entrant={entrant}
      />
    </div>
  );
}
