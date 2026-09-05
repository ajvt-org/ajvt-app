"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { appTrail } from "@/lib/historyTrail";

function TrackLocation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    appTrail.noteLocation(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}

export default function HistoryTrail() {
  return (
    <Suspense fallback={null}>
      <TrackLocation />
    </Suspense>
  );
}
