import Icon from "@/components/Icon";
import TeamLogo from "./TeamLogo";
import { formatMatchTime } from "@/lib/clubTime";
import type { PublicMatch } from "./publicTypes";

// Today's fixtures sit above the tabs: whichever tab a reader opens, the
// matches being played now are the reason they came.
export default function TodayBand({ matches }: { matches: PublicMatch[] }) {
  return (
    <div className="space-y-2">
      <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
        <Icon name="clock" size={16} className="icon-inline" /> مباريات اليوم
      </h2>
      {matches.map((match) => (
        <div
          key={match.id}
          className="card p-4"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <TeamLogo logo={match.homeTeam.logo} name={match.homeTeam.name} size={28} />
              <span className="font-bold text-sm text-white truncate">{match.homeTeam.name}</span>
            </div>
            <span dir="ltr" className="font-black text-white text-lg shrink-0 px-2">
              {match.status === "PLAYED" ? `${match.homeScore} - ${match.awayScore}` : "×"}
            </span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-bold text-sm text-white truncate">{match.awayTeam.name}</span>
              <TeamLogo logo={match.awayTeam.logo} name={match.awayTeam.name} size={28} />
            </div>
          </div>
          <div
            className="flex items-center gap-2 text-xs mt-2 flex-wrap"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {match.matchDate && <span dir="ltr">{formatMatchTime(match.matchDate)}</span>}
            {match.round && <span>{match.round}</span>}
            {match.venue && (
              <span>
                <Icon name="pin" size={12} className="icon-inline" /> {match.venue}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
