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

export default function TeamLogo({ logo, photo, size = 24, entrant = "team" }: TeamLogoProps) {
  const src = logo ? `/api/files/team/${logo}` : photo ? `/api/files/member/${photo}` : null;
  if (!src) {
    return (
      <span
        className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
        style={{ width: size, height: size, background: "var(--mint-100)", fontSize: size * 0.55 }}
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
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: "2px solid var(--mint-200)" }}
    />
  );
}
