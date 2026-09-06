import TeamLogo from "../TeamLogo";
import Scoreline from "../Scoreline";
import { matchTone, type MatchTone } from "./tone";
import type { EntrantKind } from "@/lib/entrant";

export type MatchSide = { name: string; logo?: string | null; photo?: string | null };

export type MatchTeamsSize = "xs" | "sm" | "md" | "lg" | "xl";

export const MATCH_TEAMS_SIZES: Record<MatchTeamsSize, { logo: number; score: string }> = {
  xs: { logo: 20, score: "text-xs" },
  sm: { logo: 32, score: "text-sm" },
  md: { logo: 44, score: "text-base" },
  lg: { logo: 56, score: "text-lg" },
  xl: { logo: 72, score: "text-2xl" },
};

function Name({ name, color, center }: { name: string; color: string; center?: boolean }) {
  return (
    <bdi
      className={`font-bold text-sm ${center ? "text-center" : ""}`.trim()}
      style={{ color, wordBreak: "break-word" }}
    >
      {name}
    </bdi>
  );
}

function Side({
  side,
  color,
  logoSize,
  stacked,
  away,
  entrant,
}: {
  side: MatchSide;
  color: string;
  logoSize: number;
  stacked: boolean;
  away: boolean;
  entrant: EntrantKind;
}) {
  const logo = (
    <TeamLogo
      logo={side.logo}
      photo={side.photo}
      name={side.name}
      size={logoSize}
      entrant={entrant}
    />
  );
  if (stacked) {
    return (
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        {logo}
        <Name name={side.name} color={color} center />
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${away ? "justify-end" : ""}`.trim()}>
      {away ? (
        <>
          <Name name={side.name} color={color} />
          {logo}
        </>
      ) : (
        <>
          {logo}
          <Name name={side.name} color={color} />
        </>
      )}
    </div>
  );
}

export default function MatchTeams({
  home,
  away,
  score = null,
  tone = "light",
  size,
  layout = "inline",
  separator = "×",
  entrant = "team",
}: {
  home: MatchSide;
  away: MatchSide;
  score?: { home: number | string | null; away: number | string | null } | null;
  tone?: MatchTone;
  // Required, so a card cannot accept a size by leaving it out.
  size: MatchTeamsSize;
  layout?: "inline" | "stacked";
  separator?: string;
  entrant?: EntrantKind;
}) {
  const colors = matchTone[tone];
  const dims = MATCH_TEAMS_SIZES[size];
  const stacked = layout === "stacked";
  const scoreClass = `font-black shrink-0 px-1 ${dims.score}`;

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <Side
        side={home}
        color={colors.name}
        logoSize={dims.logo}
        stacked={stacked}
        away={false}
        entrant={entrant}
      />
      {score ? (
        <Scoreline
          home={score.home}
          away={score.away}
          className={scoreClass}
          style={{ color: colors.score }}
        />
      ) : (
        <span className={scoreClass} style={{ color: colors.score }}>
          {separator}
        </span>
      )}
      <Side
        side={away}
        color={colors.name}
        logoSize={dims.logo}
        stacked={stacked}
        away
        entrant={entrant}
      />
    </div>
  );
}
