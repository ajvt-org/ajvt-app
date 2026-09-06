"use client";

import Link from "next/link";
import Icon from "./Icon";
import { backMove } from "@/lib/backNavigation";
import { appTrail } from "@/lib/historyTrail";
import { navigation } from "@/lib/texts";

export default function BackButton({ href }: { href: string }) {
  function goUp(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    if (backMove(href, appTrail) === "unwind") {
      event.preventDefault();
      window.history.back();
      return;
    }
    appTrail.noteReplacement(href);
  }

  return (
    <Link
      href={href}
      replace
      aria-label={navigation.back}
      className="btn btn-icon"
      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
      onClick={goUp}
    >
      <Icon name="chevronRight" />
    </Link>
  );
}
