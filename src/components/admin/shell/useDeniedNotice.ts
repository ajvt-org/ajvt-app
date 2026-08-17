"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useDeniedNotice() {
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.search.includes("denied=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDenied(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("denied");
    router.replace(url.pathname + url.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { denied, dismiss: () => setDenied(false) };
}
