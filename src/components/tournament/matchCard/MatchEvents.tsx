import { Fragment } from "react";
import Icon from "@/components/Icon";
import CardChip from "../CardChip";
import PlayerAvatar from "../PlayerAvatar";
import { minuteLines, type MatchEventRow } from "@/lib/matchEvents";
import { matchTone, type MatchTone } from "./tone";
import { matchDisplay } from "@/lib/texts";

const LINE = "h-6 flex items-center";
const NAME_SIZE = 10;
const UNKNOWN_MINUTE_SIZE = 13;

function UnknownMinute({ count }: { count: number }) {
  return (
    <span className="optical-numeral" role="img" aria-label={matchDisplay.unknownMinute(count)}>
      <span className="flex items-center gap-0.5">
        <Icon name="quiz" size={UNKNOWN_MINUTE_SIZE} />
        {count > 1 && <bdi>{matchDisplay.unknownMinuteTally(count)}</bdi>}
      </span>
    </span>
  );
}

function Minutes({ minutes, mirrored }: { minutes: MatchEventRow["minutes"]; mirrored?: boolean }) {
  return (
    <span className="flex flex-col">
      {minuteLines(minutes).map((line, i) => (
        <span
          key={i}
          className={`${LINE} gap-1.5 whitespace-nowrap ${mirrored ? "" : "justify-end"}`}
        >
          {line.map((token, index) =>
            token.kind === "minute" ? (
              <bdi key={index} className="optical-numeral">
                {token.label}
              </bdi>
            ) : (
              <UnknownMinute key={index} count={token.count} />
            ),
          )}
        </span>
      ))}
    </span>
  );
}

function SideList({
  rows,
  avatarSize,
  mirrored,
}: {
  rows: MatchEventRow[];
  avatarSize: number;
  mirrored?: boolean;
}) {
  if (rows.length === 0) return <span />;
  return (
    <span
      className="grid gap-x-2 gap-y-1"
      style={{
        gridTemplateColumns: mirrored ? "auto auto minmax(0,1fr)" : "auto minmax(0,1fr) auto",
      }}
    >
      {rows.map((row) => {
        const photo = (
          <span key="photo" className={LINE}>
            <PlayerAvatar photo={row.photo} fullName={row.name} size={avatarSize} />
          </span>
        );
        const name = (
          <span
            key="name"
            className="leading-6 optical-name"
            style={{ wordBreak: "break-word", fontSize: NAME_SIZE, textAlign: "start" }}
          >
            {row.name}
          </span>
        );
        const minutes = <Minutes key="minutes" minutes={row.minutes} mirrored={mirrored} />;
        return (
          <Fragment key={row.key}>
            {mirrored ? [minutes, photo, name] : [photo, name, minutes]}
          </Fragment>
        );
      })}
    </span>
  );
}

function Section({
  rows,
  icon,
  color,
  avatarSize,
}: {
  rows: MatchEventRow[];
  icon: React.ReactNode;
  color: string;
  avatarSize: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div
      className="grid gap-x-2 text-xs font-bold"
      style={{ gridTemplateColumns: "1fr auto 1fr", color }}
    >
      <SideList rows={rows.filter((row) => row.side === "home")} avatarSize={avatarSize} />
      <span className={`${LINE} justify-center w-5 shrink-0 self-start`}>{icon}</span>
      <SideList rows={rows.filter((row) => row.side === "away")} avatarSize={avatarSize} mirrored />
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
      <span className={`${LINE} justify-center w-5`} role="img" aria-label={matchDisplay.motm}>
        <Icon name="jersey" size={15} />
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
  const reds = rows.filter((row) => row.type === "red");
  const motm = rows.find((row) => row.type === "motm");
  if (goals.length === 0 && reds.length === 0 && !motm) return null;

  return (
    <div className="space-y-3">
      <Section
        rows={goals}
        icon={<Icon name="ball" size={14} />}
        color={color}
        avatarSize={avatarSize}
      />
      <Section rows={reds} icon={<CardChip type="RED" />} color={color} avatarSize={avatarSize} />
      {motm && (
        <>
          {(goals.length > 0 || reds.length > 0) && (
            <div style={{ borderTop: `1px solid ${rule}` }} />
          )}
          <ManOfTheMatch row={motm} color={color} muted={muted} avatarSize={avatarSize} />
        </>
      )}
    </div>
  );
}
