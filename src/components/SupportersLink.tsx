import Link from "next/link";
import IconLabel from "@/components/IconLabel";

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
