import { toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";
import { INITIALS_JOINER, nameInitials } from "@/lib/arabicName";

interface PlayerAvatarProps {
  photo?: string | null;

  photoUrl?: string | null;
  fullName: string;
  size?: number;
  bg?: "mint" | "copper";
}

const BG_COLORS: Record<string, { placeholder: string; border: string; ink: string }> = {
  mint: { placeholder: "var(--mint-100)", border: "var(--mint-200)", ink: "var(--mint-700)" },
  copper: {
    placeholder: "var(--copper-300)",
    border: "var(--copper-500)",
    ink: "var(--copper-700)",
  },
};

export default function PlayerAvatar({
  photo,
  photoUrl,
  fullName,
  size = 28,
  bg = "mint",
}: PlayerAvatarProps) {
  const colors = BG_COLORS[bg];
  const src = photoUrl ?? (photo ? `/api/files/member/${photo}` : null);
  if (!src) {
    const initials = nameInitials(fullName);
    return (
      <span
        aria-hidden="true"
        className="rounded-full inline-flex items-center justify-center shrink-0 align-middle"
        style={{
          width: size,
          height: size,
          background: colors.placeholder,
          color: colors.ink,
          fontSize: size * (initials.includes(INITIALS_JOINER) ? 0.4 : 0.5),
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {initials || <Icon name="user" size={Math.round(size * 0.6)} />}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toThumbUrl(src)}
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
