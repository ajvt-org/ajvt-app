"use client";

import Link from "next/link";
import Icon from "./Icon";

// A plain link rather than router.back(). window.history counts entries from
// other sites too, so going back could carry a member out of the app entirely.
// A link to a known parent always stays inside it, and works the same when the
// page was opened from a shared link with no history at all. onBack covers the
// screens whose parent is a state of the same page rather than another route.
export default function BackButton({ href, onBack }: { href?: string; onBack?: () => void }) {
  const style = { background: "rgba(255,255,255,0.15)", color: "#fff" };

  if (onBack) {
    return (
      <button onClick={onBack} aria-label="رجوع" className="btn btn-icon" style={style}>
        <Icon name="chevronRight" />
      </button>
    );
  }

  return (
    <Link href={href ?? "/"} aria-label="رجوع" className="btn btn-icon" style={style}>
      <Icon name="chevronRight" />
    </Link>
  );
}
