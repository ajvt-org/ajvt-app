import Icon from "@/components/Icon";
import PlayerAvatar from "./PlayerAvatar";
import { captainFirst, isCaptain } from "@/lib/squad";
import { publicTournament as texts } from "@/lib/texts";

export type SquadPlayer = {
  id: string;
  fullName: string;
  photo: string | null;
};

export default function SquadList({
  players,
  captainId,
}: {
  players: SquadPlayer[];
  captainId: string | null;
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
        return (
          <li
            key={player.id}
            className={`flex items-center gap-2 min-w-0 ${leads ? "col-span-full" : ""}`.trim()}
          >
            <PlayerAvatar photo={player.photo} fullName={player.fullName} size={26} />
            <span
              className="text-sm font-bold min-w-0"
              style={{ color: "var(--text-main)", wordBreak: "break-word" }}
            >
              {player.fullName}
            </span>
            {leads && (
              <span
                className="badge shrink-0"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                <Icon name="star" size={12} filled />
                {texts.captain}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
