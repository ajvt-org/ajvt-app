"use client";

import { useEffect, useRef, useState } from "react";

// Which heading has scrolled up behind the sticky banner. The banner shows
// that one's label, so a name is never on screen twice, and a profile holding
// several people names whichever one you have scrolled to.
//
// The line is the banner's own measured height rather than a constant, since
// the banner grows with the safe area and with the text size the reader picked.
const HEADER_SELECTOR = ".page-header";

export type Heading = { id: string; label: string };

export function useNameBehindHeader(headings: Heading[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const [behind, setBehind] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const header = document.querySelector(HEADER_SELECTOR);
    const line = header ? header.getBoundingClientRect().height : 0;
    if (!line) return;

    function recompute() {
      let found: string | null = null;
      for (const heading of headings) {
        const el = nodes.current.get(heading.id);
        if (el && el.getBoundingClientRect().bottom < line) found = heading.label;
      }
      setBehind(found);
    }

    const observer = new IntersectionObserver(recompute, {
      rootMargin: `-${Math.round(line)}px 0px 0px 0px`,
      threshold: [0, 1],
    });
    for (const heading of headings) {
      const el = nodes.current.get(heading.id);
      if (el) observer.observe(el);
    }

    const frame = requestAnimationFrame(recompute);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [headings]);

  function bind(id: string) {
    return (el: HTMLElement | null) => {
      if (el) nodes.current.set(id, el);
      else nodes.current.delete(id);
    };
  }

  return { bind, behind: headings.length > 0 ? behind : null };
}
