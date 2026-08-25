"use client";

import Icon from "@/components/Icon";
import Scoreline from "@/components/tournament/Scoreline";
import { formatMatchDateTime } from "@/lib/clubTime";
import { UNDATED_LABEL } from "@/lib/matchDays";
import { type Fixture } from "@/lib/memberFixtures";

function TeamName({ name, mine }: { name: string; mine: boolean }) {
  return (
    <span
      className="truncate"
      style={{
        color: mine ? "var(--mint-700)" : "var(--text-main)",
        fontWeight: mine ? 900 : 600,
      }}
    >
      {name}
    </span>
  );
}

export default function FixtureRow({ fixture }: { fixture: Fixture }) {
  const played = fixture.homeScore !== null && fixture.awayScore !== null;
  const shootout = fixture.homePenalties !== null && fixture.awayPenalties !== null;

  return (
    <div className="card p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="badge" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
          {fixture.activity.title}
        </span>
        {fixture.round && (
          <span style={{ color: "var(--text-muted)" }} className="truncate">
            {fixture.round}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamName name={fixture.homeTeam.name} mine={fixture.myTeamId === fixture.homeTeam.id} />
          <span style={{ color: "var(--text-muted)" }}>×</span>
          <TeamName name={fixture.awayTeam.name} mine={fixture.myTeamId === fixture.awayTeam.id} />
        </div>
        {played && (
          <span className="font-black shrink-0 flex items-center gap-1.5">
            <Scoreline
              home={fixture.homeScore}
              away={fixture.awayScore}
              style={{ color: "var(--mint-700)" }}
            />
            {shootout && (
              <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                (<Scoreline home={fixture.homePenalties} away={fixture.awayPenalties} />)
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <Icon name="calendar" size={12} />
          {fixture.matchDate ? formatMatchDateTime(fixture.matchDate) : UNDATED_LABEL}
        </span>
        {fixture.venue && (
          <span className="flex items-center gap-1 truncate">
            <Icon name="pin" size={12} />
            {fixture.venue}
          </span>
        )}
      </div>
    </div>
  );
}
