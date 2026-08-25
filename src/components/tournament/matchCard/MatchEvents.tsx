import { Fragment } from "react";
import Icon from "@/components/Icon";
import CardChip from "../CardChip";
import PlayerAvatar from "../PlayerAvatar";
import { minuteLines, type MatchEventRow, type MatchEventType } from "@/lib/matchEvents";
import { matchDisplay } from "@/lib/texts";
import { matchTone, type MatchTone } from "./tone";

const LINE = "h-6 flex items-center";
const ICON_CELL = `${LINE} justify-center w-4`;
const NAME_SIZE = 10;

function EventIcon({ type }: { type: MatchEventType }) {
  if (type === "yellow") return <CardChip type="YELLOW" />;
  if (type === "red") return <CardChip type="RED" />;
  if (type === "motm") return <Icon name="medal" size={14} />;
  return <Icon name="ball" size={13} />;
}

function EventGrid({
  rows,
  color,
  avatarSize,
  mirrored,
}: {
  rows: MatchEventRow[];
  color: string;
  avatarSize: number;
  mirrored?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div
      className="grid gap-x-2 gap-y-1 text-xs font-bold"
      style={{
        gridTemplateColumns: "auto auto minmax(0,1fr) auto",
        color,
      }}
    >
      {rows.map((row) => {
        const icon = (
          <span key="icon" className={ICON_CELL}>
            <EventIcon type={row.type} />
          </span>
        );
        const photo = (
          <span key="photo" className={LINE}>
            <PlayerAvatar photo={row.photo} fullName={row.name} size={avatarSize} />
          </span>
        );
        const name = (
          <span
            key="name"
            className="leading-6 optical-name"
            style={{
              wordBreak: "break-word",
              fontSize: NAME_SIZE,
              textAlign: "start",
            }}
          >
            {row.name}
          </span>
        );
        const minutes = (
          <span key="minutes" className="flex flex-col">
            {minuteLines(row.minutes).map((line, i) => (
              <span
                key={i}
                className={`${LINE} gap-1.5 whitespace-nowrap ${mirrored ? "" : "justify-end"}`}
              >
                {line.map((minute) => (
                  <bdi key={minute} className="optical-numeral">
                    {minute}
                  </bdi>
                ))}
              </span>
            ))}
          </span>
        );
        return (
          <Fragment key={row.key}>
            {mirrored ? [minutes, photo, name, icon] : [icon, photo, name, minutes]}
          </Fragment>
        );
      })}
    </div>
  );
}

function ManOfTheMatch({
  row,
  color,
  muted,
  avatarSize,
}: {
  row: MatchEventRow;
  color: string;
  muted: string;
  avatarSize: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs font-bold" style={{ color }}>
      <span className={ICON_CELL} role="img" aria-label={matchDisplay.motm}>
        <EventIcon type={row.type} />
      </span>
      <span className={LINE}>
        <PlayerAvatar photo={row.photo} fullName={row.name} size={avatarSize} />
      </span>
      <span className="leading-6 optical-name" style={{ fontSize: NAME_SIZE }}>
        {row.name}
      </span>
      {row.team && (
        <span
          className="leading-6 optical-name"
          style={{ fontSize: NAME_SIZE, color: muted, fontWeight: 700 }}
        >
          ({row.team})
        </span>
      )}
    </div>
  );
}

function Sides({
  rows,
  color,
  avatarSize,
}: {
  rows: MatchEventRow[];
  color: string;
  avatarSize: number;
}) {
  if (rows.length === 0) return null;
  const home = rows.filter((row) => row.side === "home");
  const away = rows.filter((row) => row.side === "away");
  if (home.length === 0 && away.length === 0) {
    return <EventGrid rows={rows} color={color} avatarSize={avatarSize} />;
  }
  return (
    <div className="flex gap-3">
      <div className="flex-1 min-w-0">
        <EventGrid rows={home} color={color} avatarSize={avatarSize} />
      </div>
      <div className="flex-1 min-w-0">
        <EventGrid rows={away} color={color} avatarSize={avatarSize} mirrored />
      </div>
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
  const { event: color, rule, muted } = matchTone[tone];
  const goals = rows.filter((row) => row.type === "goal");
  const cards = rows.filter((row) => row.type === "yellow" || row.type === "red");
  const motm = rows.find((row) => row.type === "motm");

  return (
    <div className="space-y-2">
      <Sides rows={goals} color={color} avatarSize={avatarSize} />
      <Sides rows={cards} color={color} avatarSize={avatarSize} />
      {motm && (
        <>
          {(goals.length > 0 || cards.length > 0) && (
            <div style={{ borderTop: `1px solid ${rule}` }} />
          )}
          <ManOfTheMatch row={motm} color={color} muted={muted} avatarSize={avatarSize} />
        </>
      )}
    </div>
  );
}
