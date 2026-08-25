import type { ReactNode } from "react";
import MatchTime from "./MatchTime";
import type { MatchTone } from "./tone";

export default function MatchCardHead({
  time,
  tone = "light",
  children,
}: {
  time?: string | null;
  tone?: MatchTone;
  children?: ReactNode;
}) {
  if (!time && !children) return null;
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">{children}</div>
      {time && <MatchTime time={time} tone={tone} />}
    </div>
  );
}
