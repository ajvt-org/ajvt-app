import PlayerAvatar from "./PlayerAvatar";
import { publicTournament as texts } from "@/lib/texts";

export type SquadPlayer = {
  id: string;
  fullName: string;
  photo: string | null;
};

export default function SquadList({ players }: { players: SquadPlayer[] }) {
  if (players.length === 0) {
    return (
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {texts.noPlayers}
      </p>
    );
  }

  return (
    <ul className="mt-2 grid gap-x-3 gap-y-2 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))]">
      {players.map((player) => (
        <li key={player.id} className="flex items-center gap-2 min-w-0">
          <PlayerAvatar photo={player.photo} fullName={player.fullName} size={26} />
          <span
            className="text-sm font-bold min-w-0"
            style={{ color: "var(--text-main)", wordBreak: "break-word" }}
          >
            {player.fullName}
          </span>
        </li>
      ))}
    </ul>
  );
}
