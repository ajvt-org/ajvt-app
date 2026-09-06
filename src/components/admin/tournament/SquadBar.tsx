import { teamsTab as texts } from "@/lib/texts";
import type { SquadSize } from "@/lib/squadSize";

const SHORT = "#d97706";
const WITHIN = "var(--mint-600)";
const OVER = "#b91c1c";
const HATCH = "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 3px, transparent 3px 7px)";
const HATCH_DARK =
  "repeating-linear-gradient(45deg, rgba(31,61,49,0.22) 0 3px, transparent 3px 7px)";

export interface OutsideShare {
  count: number;
  limit: number;
}

function inside(at: number): number {
  return Math.min(Math.max(at, 6), 94);
}

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
        insetInlineStart: `${inside(at)}%`,
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
  const max = squad.max;
  if (max === null) return null;

  const min = squad.min;
  const scale = Math.max(max, count, 1);
  const at = (value: number) => (value / scale) * 100;
  const short = min !== null && count < min;
  const filled = Math.min(count, max);
  const shared = outside ? Math.min(outside.count, count) : 0;

  return (
    <span
      role="img"
      aria-label={
        outside
          ? `${texts.squadOfRange(count, min, max)} ${texts.outsideOfLimit(outside.count, outside.limit)}`
          : texts.squadOfRange(count, min, max)
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
              width: `${at(filled)}%`,
              background: short ? SHORT : WITHIN,
            }}
          />
          {count > max && (
            <span
              className="absolute inset-y-0"
              style={{
                insetInlineStart: `${at(max)}%`,
                width: `${at(count) - at(max)}%`,
                background: OVER,
              }}
            />
          )}
          {outside && shared > outside.limit && (
            <span
              className="absolute inset-y-0"
              style={{
                insetInlineStart: `${at(outside.limit)}%`,
                width: `${at(shared) - at(outside.limit)}%`,
                background: OVER,
              }}
            />
          )}
          {shared > 0 && (
            <span
              className="absolute inset-y-0"
              style={{ insetInlineStart: 0, width: `${at(shared)}%`, backgroundImage: HATCH }}
            />
          )}
          {min !== null && min < scale && <Tick at={at(min)} />}
          <Tick at={at(max)} />
          {outside && outside.limit < scale && <Tick at={at(outside.limit)} dashed />}
        </span>
        <span
          className="absolute text-[11px] font-black tabular-nums"
          style={{
            insetInlineStart: `${inside(at(count))}%`,
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
        {outside && outside.limit < scale && (
          <AxisMark at={at(outside.limit)} value={outside.limit} dashed />
        )}
        {min !== null && min < scale && <AxisMark at={at(min)} value={min} />}
        <AxisMark at={at(max)} value={max} />
      </span>
    </span>
  );
}
