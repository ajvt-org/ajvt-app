import { teamsTab as texts } from "@/lib/texts";
import type { SquadSize } from "@/lib/squadSize";
import {
  outsideBarGeometry,
  squadBarGeometry,
  type BarGeometry,
  type OutsideShare,
} from "@/lib/squadBar";

const BAR_WIDTH = 320;
const NUMERAL_GUTTER = 10;
const SQUAD_TRACK = 18;
const OUTSIDE_TRACK = 8;
const TICK_OVERHANG = 3;
const COUNT_ROW = 17;
const AXIS_ROW = 15;
const SHORT = "#d97706";
const WITHIN = "var(--mint-600)";
const OVER = "#b91c1c";

function Bar({
  label,
  readout,
  fill,
  track,
  geometry,
}: {
  label: string;
  readout: string;
  fill: string;
  track: number;
  geometry: BarGeometry;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className="block"
      style={{ width: `min(100%, ${BAR_WIDTH}px)`, paddingInline: NUMERAL_GUTTER }}
    >
      <span
        className="block text-[12px] font-black tabular-nums leading-none"
        style={{ height: COUNT_ROW, color: "var(--text-main)" }}
      >
        {readout}
      </span>
      <span className="relative block">
        <span
          className="relative block overflow-hidden rounded-full"
          style={{ height: track, background: "var(--mint-100)" }}
        >
          <span
            className="absolute inset-y-0"
            style={{ insetInlineStart: 0, width: `${geometry.fill}%`, background: fill }}
          />
          {geometry.over && (
            <span
              className="absolute inset-y-0"
              style={{
                insetInlineStart: `${geometry.over.start}%`,
                width: `${geometry.over.width}%`,
                background: OVER,
              }}
            />
          )}
        </span>
        {geometry.marks.map((mark) => (
          <span
            key={mark.value}
            className="absolute"
            style={{
              insetInlineStart: `${mark.at}%`,
              top: -TICK_OVERHANG,
              height: track + TICK_OVERHANG * 2,
              width: 2,
              marginInlineStart: -1,
              background: "#1f3d31",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.85)",
            }}
          />
        ))}
      </span>
      <span
        className="relative block text-[11px] font-bold"
        style={{ height: AXIS_ROW, color: "var(--text-muted)" }}
      >
        {geometry.marks.map((mark) => (
          <span
            key={mark.value}
            className="absolute top-0 tabular-nums"
            style={{ insetInlineStart: `${mark.at}%`, transform: "translateX(50%)" }}
          >
            {mark.value}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function SquadBar({
  count,
  squad,
  outside,
}: {
  count: number;
  squad: SquadSize;
  outside: OutsideShare | null;
}) {
  const squadBar = squadBarGeometry(count, squad);
  if (squadBar === null) return null;

  return (
    <>
      <Bar
        label={texts.squadOfRange(count, squadBar.min, squadBar.max)}
        readout={texts.rosterCount(count)}
        fill={squadBar.short ? SHORT : WITHIN}
        track={SQUAD_TRACK}
        geometry={squadBar}
      />
      {outside && (
        <Bar
          label={texts.outsideOfLimit(outside.count, outside.limit)}
          readout={texts.outsideCount(outside.count)}
          fill={WITHIN}
          track={OUTSIDE_TRACK}
          geometry={outsideBarGeometry(outside)}
        />
      )}
    </>
  );
}
