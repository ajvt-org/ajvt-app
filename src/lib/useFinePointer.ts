"use client";

import { useEffect, useState } from "react";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(FINE_POINTER);
    const read = () => setFine(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  return fine;
}
