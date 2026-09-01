import { COLUMN_GAP, connectorPaths } from "@/lib/bracketLayout";

export default function BracketConnectors({
  feederTops,
  tops,
  height,
}: {
  feederTops: number[];
  tops: number[];
  height: number;
}) {
  const paths = connectorPaths(feederTops, tops, COLUMN_GAP);
  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute top-0 pointer-events-none"
      style={{ left: -COLUMN_GAP, width: COLUMN_GAP, height }}
      width={COLUMN_GAP}
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--mint-200)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
