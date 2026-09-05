import { toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";
import type { EntrantKind } from "@/lib/entrant";

interface TeamLogoProps {
  logo: string | null | undefined;
  photo?: string | null;
  name: string;
  size?: number;
  entrant?: EntrantKind;
}

export default function TeamLogo({ logo, photo, size = 28, entrant = "team" }: TeamLogoProps) {
  const src = logo ? `/api/files/team/${logo}` : photo ? `/api/files/member/${photo}` : null;
  const disc = {
    width: size,
    height: size,
    border: "1.5px solid var(--mint-200)",
    boxShadow: "0 1px 3px rgba(26, 63, 51, 0.3)",
  };
  if (!src) {
    return (
      <span
        className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
        style={{ ...disc, background: "var(--mint-100)" }}
      >
        <Icon name={entrant === "player" ? "user" : "shield"} size={Math.round(size * 0.6)} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toThumbUrl(src)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="rounded-full object-cover shrink-0 align-middle"
      style={disc}
    />
  );
}
