import Link from "next/link";
import Icon from "./Icon";

// A plain link rather than router.back(). window.history counts entries from
// other sites too, so going back could carry a member out of the app entirely
// — a link to a known parent always stays inside it, and works the same when
// the page was opened from a shared link with no history at all.
export default function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="رجوع"
      className="btn btn-icon"
      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
    >
      <Icon name="chevronRight" />
    </Link>
  );
}
