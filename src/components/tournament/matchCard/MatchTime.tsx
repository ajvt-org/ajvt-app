import Icon from "@/components/Icon";
import type { MatchTone } from "./tone";

export default function MatchTime({ time, tone = "light" }: { time: string; tone?: MatchTone }) {
  return (
    <span className={`match-time ${tone === "dark" ? "match-time-dark" : ""}`.trim()}>
      <Icon name="clock" size={12} />
      <span dir="ltr">{time}</span>
    </span>
  );
}
