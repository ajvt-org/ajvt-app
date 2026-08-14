import Link from "next/link";

// A plain link rather than router.back(). window.history counts entries from
// other sites too, so going back could carry a member out of the app entirely
// — a link to a known parent always stays inside it, and works the same when
// the page was opened from a shared link with no history at all.
export default function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="رجوع"
      className="shrink-0 rounded-lg flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        background: "rgba(255,255,255,0.15)",
        color: "#fff",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}
