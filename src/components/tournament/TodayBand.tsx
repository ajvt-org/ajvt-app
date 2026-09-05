import Icon from "@/components/Icon";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchCardHead from "./matchCard/MatchCardHead";
import { formatMatchTime } from "@/lib/clubTime";
import { matchDisplay as texts } from "@/lib/texts";
import { teamName } from "@/lib/fixtureTeams";
import type { PublicMatch } from "./publicTypes";
import type { EntrantKind } from "@/lib/entrant";

export default function TodayBand({
  matches,
  entrant = "team",
}: {
  matches: PublicMatch[];
  entrant?: EntrantKind;
}) {
  return (
    <div className="space-y-2">
      <h2
        className="font-black text-base flex items-center gap-1.5"
        style={{ color: "var(--text-main)" }}
      >
        <Icon name="clock" size={16} className="icon-optical" />
        {texts.todayMatches}
      </h2>
      {matches.map((match) => (
        <div
          key={match.id}
          className="card p-4 space-y-2"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <MatchCardHead
            time={match.matchDate ? formatMatchTime(match.matchDate) : null}
            tone="dark"
          >
            <MatchMeta round={match.round} venue={match.venue} tone="dark" />
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
            score={
              match.status === "PLAYED" ? { home: match.homeScore, away: match.awayScore } : null
            }
            tone="dark"
            size="lg"
            layout="stacked"
            entrant={entrant}
          />
        </div>
      ))}
    </div>
  );
}
