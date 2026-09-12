"use client";

import Icon from "@/components/Icon";
import { type RenewalRefusal } from "@/lib/renewal";
import { renewalRefusalMessage } from "@/lib/renewalMessages";

export default function RenewalRefusalNote({ refusal }: { refusal: NonNullable<RenewalRefusal> }) {
  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        <Icon name="warning" size={13} className="icon-inline" /> {renewalRefusalMessage(refusal)}
      </p>
    </div>
  );
}
