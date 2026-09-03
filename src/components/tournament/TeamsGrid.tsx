import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import TeamLogo from "./TeamLogo";
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

export default function TeamsGrid({
  teams,
  viewerId = null,
}: {
  teams: Team[];
  viewerId?: string | null;
}) {
  return (
    <div className="space-y-2">
      {viewerTeamFirst(teams, viewerId).map((team) => {
        const mine = holdsViewer(team, viewerId);
        return (
          <details
            key={team.id}
            className="card p-3"
            style={
              mine
                ? { background: "var(--mint-50)", borderInlineStart: "3px solid var(--mint-600)" }
                : undefined
            }
          >
            <summary
              className="disclosure-summary font-bold text-sm cursor-pointer flex items-center gap-1.5"
              style={{ color: "var(--text-main)" }}
            >
              <TeamLogo logo={team.logo} name={team.name} size={20} />
              <span className="min-w-0 flex-1" style={{ wordBreak: "break-word" }}>
                {team.name}
              </span>
              <span
                className="shrink-0 text-xs"
                style={{ color: "var(--text-muted)", fontWeight: 400 }}
              >
                <IconLabel name="users">{texts.playerCount(team.members.length)}</IconLabel>
              </span>
              <Icon name="chevronDown" size={14} className="disclosure-chevron" />
            </summary>
            <SquadList
              players={team.members.map((entry) => entry.member)}
              captainId={team.captainUserId}
              viewerId={viewerId}
            />
          </details>
        );
      })}
    </div>
  );
}
