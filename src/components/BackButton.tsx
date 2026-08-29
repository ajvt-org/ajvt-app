"use client";

import Link from "next/link";
import Icon from "./Icon";

export default function BackButton({ href, onBack }: { href?: string; onBack?: () => void }) {
  const style = { background: "rgba(255,255,255,0.15)", color: "#fff" };

  if (onBack) {
    return (
      <button onClick={onBack} aria-label="رجوع" className="btn btn-icon" style={style}>
        <Icon name="chevronRight" />
      </button>
    );
  }

  return (
    <Link href={href ?? "/"} aria-label="رجوع" className="btn btn-icon" style={style}>
      <Icon name="chevronRight" />
    </Link>
  );
}
