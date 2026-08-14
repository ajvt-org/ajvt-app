"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function goBack() {
    // A member arriving from a shared link or a cold PWA start has no history
    // to pop, so send them to the closest sensible parent instead.
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
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
    </button>
  );
}
