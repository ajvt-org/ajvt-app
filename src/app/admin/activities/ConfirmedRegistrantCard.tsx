"use client";

import RegistrantIdentity from "./RegistrantIdentity";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export default function ConfirmedRegistrantCard({
  registration,
  onUnregister,
}: {
  registration: Registration;
  onUnregister: (userId: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-2 flex items-center justify-between gap-2"
      style={{ background: "var(--mint-50)" }}
    >
      <RegistrantIdentity registration={registration} />
      <button
        onClick={() => onUnregister(registration.member.id)}
        className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        {texts.remove}
      </button>
    </div>
  );
}
