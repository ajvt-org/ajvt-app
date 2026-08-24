export default function Scoreline({
  home,
  away,
  className,
  style,
}: {
  home: number | string | null;
  away: number | string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      dir="rtl"
      className={`inline-flex items-center gap-1 ${className ?? ""}`.trim()}
      style={style}
    >
      <span>{home}</span>
      <span>-</span>
      <span>{away}</span>
    </span>
  );
}
