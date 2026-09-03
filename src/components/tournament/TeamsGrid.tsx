import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import TeamLogo from "./TeamLogo";
import SquadList, { type SquadPlayer } from "./SquadList";
import { publicTournament as texts } from "@/lib/texts";

type Team = {
  id: string;
  name: string;
  logo: string | null;
  members: { member: SquadPlayer }[];
};

export default function TeamsGrid({ teams }: { teams: Team[] }) {
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <details key={team.id} className="card p-3">
          <summary
            className="disclosure-summary font-bold text-sm cursor-pointer flex items-center gap-1.5"
            style={{ color: "var(--text-main)" }}
          >
            <TeamLogo logo={team.logo} name={team.name} size={20} />
            <span className="min-w-0 flex-1 truncate">{team.name}</span>
            <span
              className="shrink-0 text-xs"
              style={{ color: "var(--text-muted)", fontWeight: 400 }}
            >
              <IconLabel name="users">{texts.playerCount(team.members.length)}</IconLabel>
            </span>
            <Icon name="chevronDown" size={14} className="disclosure-chevron" />
          </summary>
          <SquadList players={team.members.map((entry) => entry.member)} />
        </details>
      ))}
    </div>
  );
}
