"use client";

import Link from "next/link";
import Icon from "./Icon";
import { appTrail } from "@/lib/historyTrail";
import { navigation } from "@/lib/texts";

export default function BackButton({ href }: { href: string }) {
  function unwind(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0 || !appTrail.canUnwind()) return;
    event.preventDefault();
    window.history.back();
  }

  return (
    <Link
      href={href}
      aria-label={navigation.back}
      className="btn btn-icon"
      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
      onClick={unwind}
    >
      <Icon name="chevronRight" />
    </Link>
  );
}
