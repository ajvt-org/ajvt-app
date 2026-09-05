import Icon from "@/components/Icon";
import TeamLogo from "@/components/tournament/TeamLogo";
import { publicTournament as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

export interface BracketSideTeam {
  id: string;
  name: string;
  logo?: string | null;
  photo?: string | null;
}

interface BracketSideProps {
  team: BracketSideTeam | null;
  score: number | null;
  penalties: number | null;
  played: boolean;
  winner: boolean;
  height: number;
  background: string;
  borderTop?: string;
  entrant?: EntrantKind;
  bye?: boolean;
}

export default function BracketSide({
  team,
  score,
  penalties,
  played,
  winner,
  height,
  background,
  borderTop,
  entrant = "team",
  bye = false,
}: BracketSideProps) {
  return (
    <div
      className="flex items-center justify-between gap-1 px-2 text-xs"
      style={{ height, background, fontWeight: winner ? 700 : 400, borderTop }}
    >
      <span className="flex items-center gap-1 min-w-0">
        {team ? (
          <TeamLogo
            logo={team.logo}
            photo={team.photo}
            name={team.name}
            size={16}
            entrant={entrant}
          />
        ) : (
          <span
            className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
            style={{ width: 16, height: 16, background: "var(--mint-100)" }}
          >
            <Icon name="question" size={10} />
          </span>
        )}
        {winner && <Icon name="trophy" size={12} color="var(--copper-600)" />}
        <bdi
          className="truncate"
          title={team?.name}
          style={{ color: team ? "var(--text-main)" : "var(--text-muted)" }}
        >
          {team ? team.name : bye ? texts.bye : texts.teamDecidedLater}
        </bdi>
      </span>
      {played && (
        <span className="shrink-0">
          {score}
          {penalties !== null && <span style={{ color: "var(--text-muted)" }}> ({penalties})</span>}
        </span>
      )}
    </div>
  );
}
