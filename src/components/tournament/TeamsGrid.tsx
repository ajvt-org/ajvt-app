import Icon from "@/components/Icon";
import TeamLogo from "./TeamLogo";
import PlayerAvatar from "./PlayerAvatar";

type Team = {
  id: string;
  name: string;
  logo: string | null;
  members: { member: { id: string; fullName: string; photo: string | null } }[];
};

export default function TeamsGrid({ teams }: { teams: Team[] }) {
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <details key={team.id} className="card p-3">
          <summary
            className="team-summary font-bold text-sm cursor-pointer flex items-center gap-1.5"
            style={{ color: "var(--text-main)" }}
          >
            <TeamLogo logo={team.logo} name={team.name} size={20} />
            <span className="min-w-0 flex-1 truncate">{team.name}</span>
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              {team.members.length}
            </span>
            <Icon name="chevronDown" size={14} className="team-chevron" />
          </summary>
          {team.members.length === 0 ? (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              لا يوجد لاعبون بعد
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {team.members.map(({ member }) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <PlayerAvatar photo={member.photo} fullName={member.fullName} size={22} />
                  {member.fullName}
                </li>
              ))}
            </ul>
          )}
        </details>
      ))}
    </div>
  );
}
