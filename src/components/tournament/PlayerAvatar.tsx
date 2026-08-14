import { toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";

interface PlayerAvatarProps {
  photo: string | null;
  fullName: string;
  size?: number;
  bg?: "mint" | "copper";
}

const BG_COLORS: Record<string, { placeholder: string; border: string }> = {
  mint: { placeholder: "var(--mint-100)", border: "var(--mint-200)" },
  copper: { placeholder: "var(--copper-300)", border: "var(--copper-500)" },
};

export default function PlayerAvatar({
  photo,
  fullName,
  size = 28,
  bg = "mint",
}: PlayerAvatarProps) {
  const colors = BG_COLORS[bg];
  if (!photo) {
    return (
      <span
        className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
        style={{ width: size, height: size, background: colors.placeholder, fontSize: size * 0.55 }}
      >
        <Icon name="user" size={Math.round(size * 0.6)} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toThumbUrl(`/api/files/member/${photo}`)}
      alt={fullName}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: `2px solid ${colors.border}` }}
    />
  );
}
