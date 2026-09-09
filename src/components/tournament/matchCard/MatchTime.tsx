import Icon from "@/components/Icon";
import type { MatchTone } from "./tone";

export default function MatchTime({ time, tone = "light" }: { time: string; tone?: MatchTone }) {
  return (
    <span className={`match-time ${tone === "dark" ? "match-time-dark" : ""}`.trim()}>
      <Icon name="clock" size={12} />
      <bdi dir="ltr" className="optical-numeral">
        {time}
      </bdi>
    </span>
  );
}
