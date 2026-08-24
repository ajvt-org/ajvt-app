// The home team is drawn first, which in a right-to-left page puts it on the
// right, so the home score belongs on the right of the dash too. Written as
// plain text the bidi algorithm works that out on its own, but the scores used
// to sit in a dir="ltr" span — put there to keep the digits together — and that
// pins the home number to the left, beside the away team. Every score on the
// public side read backwards because of it.
//
// The two numbers are laid out as flex items in their own right-to-left box
// instead, so each one sits on its team's side whatever surrounds it.
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
