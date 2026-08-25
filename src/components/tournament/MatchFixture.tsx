import Icon from "@/components/Icon";
import TeamLogo from "./TeamLogo";
import { formatMatchTime } from "@/lib/clubTime";
import type { PublicMatch } from "./publicTypes";

export default function MatchFixture({
  match,
  day,
}: {
  match: PublicMatch;
  day: { round: string | null; venue: string | null };
}) {
  const round = day.round ? null : match.round;
  const venue = day.venue ? null : match.venue;

  return (
    <div className="card p-3 flex items-center gap-3">
      {match.matchDate && (
        <span className="fixture-time" dir="ltr">
          {formatMatchTime(match.matchDate)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className="font-bold text-sm flex items-center gap-1.5 flex-wrap"
          style={{ color: "var(--text-main)" }}
        >
          <TeamLogo logo={match.homeTeam.logo} name={match.homeTeam.name} size={18} />
          <bdi>{match.homeTeam.name}</bdi>
          <span style={{ color: "var(--text-muted)" }}>×</span>
          <TeamLogo logo={match.awayTeam.logo} name={match.awayTeam.name} size={18} />
          <bdi>{match.awayTeam.name}</bdi>
        </p>
        {(round || venue) && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {round}
            {round && venue && " · "}
            {venue && (
              <>
                <Icon name="pin" size={12} className="icon-inline" /> {venue}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
