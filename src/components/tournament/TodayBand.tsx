import Icon from "@/components/Icon";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchCardHead from "./matchCard/MatchCardHead";
import { formatMatchTime } from "@/lib/clubTime";
import { matchDisplay as texts } from "@/lib/texts";
import type { PublicMatch } from "./publicTypes";

export default function TodayBand({ matches }: { matches: PublicMatch[] }) {
  return (
    <div className="space-y-2">
      <h2
        className="font-black text-base flex items-center gap-1.5"
        style={{ color: "var(--text-main)" }}
      >
        <Icon name="clock" size={16} />
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
            home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
            away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
            score={
              match.status === "PLAYED" ? { home: match.homeScore, away: match.awayScore } : null
            }
            tone="dark"
            size="lg"
            layout="stacked"
          />
        </div>
      ))}
    </div>
  );
}
