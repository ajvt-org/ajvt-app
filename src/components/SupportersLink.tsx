import Link from "next/link";
import IconLabel from "@/components/IconLabel";

// The honour roll has a tab of its own, so this is only for the moment right
// after someone gives, where it is a call to action rather than navigation.
export default function SupportersLink({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href="/leaderboard"
      className={className ?? "text-sm font-bold block text-center"}
      style={style ?? { color: "var(--mint-600)" }}
    >
      <IconLabel name="trophy">شاهد لوحة شرف المتبرعين</IconLabel>
    </Link>
  );
}
