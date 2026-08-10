interface PlayerAvatarProps {
  photo: string | null;
  fullName: string;
  size?: number;
}

export default function PlayerAvatar({ photo, fullName, size = 28 }: PlayerAvatarProps) {
  if (!photo) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{ width: size, height: size, background: "var(--mint-100)", fontSize: size * 0.55 }}
      >
        👤
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/files/member/${photo}`}
      alt={fullName}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
