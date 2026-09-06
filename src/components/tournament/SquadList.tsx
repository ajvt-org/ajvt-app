import Icon from "@/components/Icon";
import PlayerAvatar from "./PlayerAvatar";
import FollowTeamButton from "./FollowTeamButton";
import { captainFirst, isCaptain, isViewer } from "@/lib/squad";
import { publicTournament as texts } from "@/lib/texts";

export type SquadPlayer = {
  id: string;
  fullName: string;
  photo: string | null;
  teamId?: string;
};

export default function SquadList({
  players,
  captainId,
  viewerId = null,
  follow = false,
}: {
  players: SquadPlayer[];
  captainId: string | null;
  viewerId?: string | null;
  follow?: boolean;
}) {
  if (players.length === 0) {
    return (
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {texts.noPlayers}
      </p>
    );
  }

  return (
    <ul className="mt-2 grid gap-x-3 gap-y-2 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))]">
      {captainFirst(players, captainId).map((player) => {
        const leads = isCaptain(player.id, captainId);
        const mine = isViewer(player.id, viewerId);
        return (
          <li
            key={player.id}
            className={`flex items-center gap-2 min-w-0 rounded-lg px-1.5 -mx-1.5 py-1 -my-1 ${leads ? "col-span-full" : ""}`.trim()}
            style={mine ? { background: "var(--mint-100)" } : undefined}
          >
            <PlayerAvatar photo={player.photo} fullName={player.fullName} size={26} />
            <span
              className="text-sm font-bold min-w-0"
              style={{
                color: mine ? "var(--mint-700)" : "var(--text-main)",
                wordBreak: "break-word",
              }}
            >
              {player.fullName}
            </span>
            {leads && (
              <span
                role="img"
                aria-label={texts.captain}
                className="badge badge-mark shrink-0"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                <Icon name="captain" size={12} />
              </span>
            )}
            {follow && player.teamId && (
              <span className="ms-auto shrink-0">
                <FollowTeamButton teamId={player.teamId} entrant="player" />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
