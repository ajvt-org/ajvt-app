interface TeamLogoProps {
  logo: string | null | undefined;
  name: string;
  size?: number;
}

export default function TeamLogo({ logo, size = 24 }: TeamLogoProps) {
  if (!logo) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{ width: size, height: size, background: "var(--mint-100)", fontSize: size * 0.55 }}
      >
        🛡️
      </div>
    );
  }
  return (
    // Decorative — the team name is always rendered as visible text right next
    // to this logo, so alt="" avoids screen readers/copy-paste doubling it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/files/team/${logo}`}
      alt=""
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: "2px solid var(--mint-200)" }}
    />
  );
}
