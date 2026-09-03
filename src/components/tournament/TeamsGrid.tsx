import Icon from "@/components/Icon";
import TeamCardHead from "./TeamCardHead";
import SquadList, { type SquadPlayer } from "./SquadList";
import { holdsViewer, viewerTeamFirst } from "@/lib/squad";
import { publicTournament as texts } from "@/lib/texts";

type Team = {
  id: string;
  name: string;
  logo: string | null;
  captainUserId: string | null;
  members: { member: SquadPlayer }[];
};

const HEAD = "font-bold text-sm flex items-center gap-1.5";

function cardStyle(mine: boolean) {
  return mine
    ? { background: "var(--mint-50)", borderInlineStart: "3px solid var(--mint-600)" }
    : undefined;
}

export default function TeamsGrid({
  teams,
  viewerId = null,
}: {
  teams: Team[];
  viewerId?: string | null;
}) {
  return (
    <div className="space-y-2">
      {viewerTeamFirst(teams, viewerId).map((team) => (
        <details key={team.id} className="card p-3" style={cardStyle(holdsViewer(team, viewerId))}>
          <summary
            className={`disclosure-summary cursor-pointer ${HEAD}`}
            style={{ color: "var(--text-main)" }}
          >
            <TeamCardHead
              logo={team.logo}
              name={team.name}
              note={texts.playerCount(team.members.length)}
            />
            <Icon name="chevronDown" size={14} className="disclosure-chevron" />
          </summary>
          <SquadList
            players={team.members.map((entry) => entry.member)}
            captainId={team.captainUserId}
            viewerId={viewerId}
          />
        </details>
      ))}
    </div>
  );
}
