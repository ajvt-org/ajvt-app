"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Admin traffic isn't "site visitors" for this stat — a handful of admins
    // navigating around all day would drown out real public visits.
    if (pathname?.startsWith("/admin")) return;
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
  }, [pathname]);

  return null;
}
