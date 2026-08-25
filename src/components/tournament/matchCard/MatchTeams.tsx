import TeamLogo from "../TeamLogo";
import Scoreline from "../Scoreline";
import { matchTone, type MatchTone } from "./tone";

export type MatchSide = { name: string; logo?: string | null };

export type MatchTeamsSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<MatchTeamsSize, { logo: number; score: string }> = {
  sm: { logo: 18, score: "text-sm" },
  md: { logo: 20, score: "text-base" },
  lg: { logo: 28, score: "text-lg" },
  xl: { logo: 28, score: "text-2xl" },
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
}: {
  side: MatchSide;
  color: string;
  logoSize: number;
  stacked: boolean;
  away: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        <TeamLogo logo={side.logo} name={side.name} size={logoSize} />
        <Name name={side.name} color={color} center />
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${away ? "justify-end" : ""}`.trim()}>
      {away ? (
        <>
          <Name name={side.name} color={color} />
          <TeamLogo logo={side.logo} name={side.name} size={logoSize} />
        </>
      ) : (
        <>
          <TeamLogo logo={side.logo} name={side.name} size={logoSize} />
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
  size = "md",
  layout = "inline",
  separator = "×",
}: {
  home: MatchSide;
  away: MatchSide;
  score?: { home: number | string | null; away: number | string | null } | null;
  tone?: MatchTone;
  size?: MatchTeamsSize;
  layout?: "inline" | "stacked";
  separator?: string;
}) {
  const colors = matchTone[tone];
  const dims = SIZES[size];
  const stacked = layout === "stacked";
  const scoreClass = `font-black shrink-0 px-1 ${dims.score}`;

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <Side side={home} color={colors.name} logoSize={dims.logo} stacked={stacked} away={false} />
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
      <Side side={away} color={colors.name} logoSize={dims.logo} stacked={stacked} away />
    </div>
  );
}
