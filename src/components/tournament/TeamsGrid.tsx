"use client";

import Icon from "@/components/Icon";
import TeamCardHead from "./TeamCardHead";
import FollowTeamButton from "./FollowTeamButton";
import SquadList, { type SquadPlayer } from "./SquadList";
import { holdsViewer, viewerTeamFirst } from "@/lib/squad";
import { useOpenTeam } from "@/hooks/useOpenTeam";
import { publicTournament as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

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

function FollowTeam({ teamId }: { teamId: string }) {
  return (
    <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
      <FollowTeamButton teamId={teamId} />
    </span>
  );
}

export default function TeamsGrid({
  teams,
  viewerId = null,
  entrant = "team",
}: {
  teams: Team[];
  viewerId?: string | null;
  entrant?: EntrantKind;
}) {
  const { isOpen, toggle } = useOpenTeam([]);

  if (entrant === "player") {
    return (
      <SquadList
        players={viewerTeamFirst(teams, viewerId).flatMap((team) =>
          team.members.map((entry) => ({ ...entry.member, teamId: team.id })),
        )}
        captainId={null}
        viewerId={viewerId}
        follow
      />
    );
  }

  return (
    <div className="space-y-2">
      {viewerTeamFirst(teams, viewerId).map((team) => {
        const mine = holdsViewer(team, viewerId);
        if (team.members.length === 0) {
          return (
            <div key={team.id} className="card p-3" style={cardStyle(mine)}>
              <p className={HEAD} style={{ color: "var(--text-main)" }}>
                <TeamCardHead logo={team.logo} name={team.name} note={texts.noPlayers} />
                <FollowTeam teamId={team.id} />
              </p>
            </div>
          );
        }
        return (
          <details
            key={team.id}
            className="card p-3"
            style={cardStyle(mine)}
            open={isOpen(team.id)}
          >
            <summary
              className={`disclosure-summary cursor-pointer ${HEAD}`}
              style={{ color: "var(--text-main)" }}
              onClick={(e) => {
                e.preventDefault();
                toggle(team.id, e.currentTarget);
              }}
            >
              <TeamCardHead
                logo={team.logo}
                name={team.name}
                note={texts.playerCount(team.members.length)}
              />
              <FollowTeam teamId={team.id} />
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
