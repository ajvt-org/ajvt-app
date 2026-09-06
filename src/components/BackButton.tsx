"use client";

import BackAffordance from "./BackAffordance";
import Icon from "./Icon";
import { navigation } from "@/lib/texts";

export default function BackButton({ href }: { href: string }) {
  return (
    <BackAffordance
      href={href}
      label={navigation.back}
      className="btn btn-icon"
      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
    >
      <Icon name="chevronRight" />
    </BackAffordance>
  );
}
