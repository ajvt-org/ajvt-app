import { toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";

interface TeamLogoProps {
  logo: string | null | undefined;
  name: string;
  size?: number;
}

export default function TeamLogo({ logo, size = 24 }: TeamLogoProps) {
  if (!logo) {
    return (
      <span
        className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
        style={{ width: size, height: size, background: "var(--mint-100)", fontSize: size * 0.55 }}
      >
        <Icon name="shield" size={Math.round(size * 0.6)} />
      </span>
    );
  }
  return (
    // Decorative — the team name is always rendered as visible text right next
    // to this logo, so alt="" avoids screen readers/copy-paste doubling it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toThumbUrl(`/api/files/team/${logo}`)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: "2px solid var(--mint-200)" }}
    />
  );
}
