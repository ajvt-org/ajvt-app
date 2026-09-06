import { teamsTab as texts } from "@/lib/texts";
import type { SquadSize } from "@/lib/squadSize";
import { insideTrack, squadBarGeometry, type OutsideShare } from "@/lib/squadBar";

const SHORT = "#d97706";
const WITHIN = "var(--mint-600)";
const OVER = "#b91c1c";
const HATCH = "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 3px, transparent 3px 7px)";
const HATCH_DARK =
  "repeating-linear-gradient(45deg, rgba(31,61,49,0.22) 0 3px, transparent 3px 7px)";

function Tick({ at, dashed }: { at: number; dashed?: boolean }) {
  return (
    <span
      className="absolute inset-y-0"
      style={{
        insetInlineStart: `${Math.min(at, 100)}%`,
        width: 2,
        marginInlineStart: at >= 100 ? -2 : -1,
        background: dashed
          ? "repeating-linear-gradient(180deg, #1f3d31 0 3px, transparent 3px 6px)"
          : "#1f3d31",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.85)",
      }}
    />
  );
}

function AxisMark({ at, value, dashed }: { at: number; value: number; dashed?: boolean }) {
  return (
    <span
      className="absolute top-0 tabular-nums"
      style={{
        insetInlineStart: `${insideTrack(at)}%`,
        transform: "translateX(50%)",
        backgroundImage: dashed ? HATCH_DARK : undefined,
        borderRadius: dashed ? 4 : undefined,
        paddingInline: dashed ? 3 : undefined,
      }}
    >
      {value}
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
  const bar = squadBarGeometry(count, squad, outside);
  if (bar === null) return null;

  return (
    <span
      role="img"
      aria-label={
        outside
          ? `${texts.squadOfRange(count, bar.min, bar.max)} ${texts.outsideOfLimit(outside.count, outside.limit)}`
          : texts.squadOfRange(count, bar.min, bar.max)
      }
      className="block w-full"
    >
      <span className="relative block">
        <span
          className="relative block overflow-hidden rounded-full"
          style={{ height: 18, background: "var(--mint-100)" }}
        >
          <span
            className="absolute inset-y-0"
            style={{
              insetInlineStart: 0,
              width: `${bar.fill}%`,
              background: bar.short ? SHORT : WITHIN,
            }}
          />
          {bar.over && (
            <span
              className="absolute inset-y-0"
              style={{
                insetInlineStart: `${bar.over.start}%`,
                width: `${bar.over.width}%`,
                background: OVER,
              }}
            />
          )}
          {bar.outsideOver && (
            <span
              className="absolute inset-y-0"
              style={{
                insetInlineStart: `${bar.outsideOver.start}%`,
                width: `${bar.outsideOver.width}%`,
                background: OVER,
              }}
            />
          )}
          {bar.hatch !== null && (
            <span
              className="absolute inset-y-0"
              style={{ insetInlineStart: 0, width: `${bar.hatch}%`, backgroundImage: HATCH }}
            />
          )}
          {bar.ticks.map((tick) => (
            <Tick key={`${tick.at}-${tick.dashed}`} at={tick.at} dashed={tick.dashed} />
          ))}
        </span>
        <span
          className="absolute text-[11px] font-black tabular-nums"
          style={{
            insetInlineStart: `${bar.countAt}%`,
            top: "50%",
            transform: "translate(50%, -50%)",
            color: "var(--text-main)",
            background: "rgba(255,255,255,0.92)",
            borderRadius: 6,
            padding: "0 4px",
            lineHeight: "16px",
          }}
        >
          {count}
        </span>
      </span>
      <span
        className="relative block text-[10px] font-bold"
        style={{ height: 14, color: "var(--text-muted)" }}
      >
        {bar.axis.map((mark) => (
          <AxisMark key={mark.value} at={mark.at} value={mark.value} dashed={mark.dashed} />
        ))}
      </span>
    </span>
  );
}
