import { Fragment } from "react";
import Icon from "@/components/Icon";
import CardChip from "../CardChip";
import PlayerAvatar from "../PlayerAvatar";
import { minuteLines, type MatchEventRow, type MatchEventType } from "@/lib/matchEvents";
import { matchTone, type MatchTone } from "./tone";

const LINE = "h-6 flex items-center";

function EventIcon({ type }: { type: MatchEventType }) {
  if (type === "yellow") return <CardChip type="YELLOW" />;
  if (type === "red") return <CardChip type="RED" />;
  if (type === "motm") return <Icon name="star" size={13} filled />;
  return <Icon name="ball" size={13} />;
}

function EventGrid({
  rows,
  color,
  avatarSize,
}: {
  rows: MatchEventRow[];
  color: string;
  avatarSize: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div
      className="grid gap-x-2 gap-y-1 text-xs font-bold"
      style={{ gridTemplateColumns: "auto auto minmax(0,1fr) auto", color }}
    >
      {rows.map((row) => (
        <Fragment key={row.key}>
          <span className={LINE}>
            <EventIcon type={row.type} />
          </span>
          <span className={LINE}>
            <PlayerAvatar photo={row.photo} fullName={row.name} size={avatarSize} />
          </span>
          <span className="leading-6 optical-name" style={{ wordBreak: "break-word" }}>
            {row.name}
          </span>
          <span className="flex flex-col">
            {minuteLines(row.minutes).map((line, i) => (
              <span key={i} className={`${LINE} gap-1.5 whitespace-nowrap`}>
                {line.map((minute) => (
                  <bdi key={minute} className="optical-numeral">
                    {minute}
                  </bdi>
                ))}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export default function MatchEvents({
  rows,
  tone = "light",
  avatarSize = 18,
}: {
  rows: MatchEventRow[];
  tone?: MatchTone;
  avatarSize?: number;
}) {
  if (rows.length === 0) return null;
  const color = matchTone[tone].event;
  const home = rows.filter((row) => row.side === "home");
  const away = rows.filter((row) => row.side === "away");
  const shared = rows.filter((row) => row.side === null);

  if (home.length === 0 && away.length === 0) {
    return <EventGrid rows={shared} color={color} avatarSize={avatarSize} />;
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <EventGrid rows={home} color={color} avatarSize={avatarSize} />
        </div>
        <div className="flex-1 min-w-0">
          <EventGrid rows={away} color={color} avatarSize={avatarSize} />
        </div>
      </div>
      <EventGrid rows={shared} color={color} avatarSize={avatarSize} />
    </div>
  );
}
