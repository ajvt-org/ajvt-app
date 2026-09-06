"use client";

import Link from "next/link";
import { backMove, opensHere } from "@/lib/backNavigation";
import { appTrail } from "@/lib/historyTrail";

export default function BackAffordance({
  href,
  label,
  className,
  style,
  children,
}: {
  href: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  function goUp(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!opensHere(event)) return;
    if (backMove(href, appTrail) === "unwind") {
      event.preventDefault();
      window.history.back();
      return;
    }
    appTrail.noteReplacement(href);
  }

  return (
    <Link href={href} replace aria-label={label} className={className} style={style} onClick={goUp}>
      {children}
    </Link>
  );
}
