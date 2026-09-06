"use client";

import RegistrantIdentity from "./RegistrantIdentity";
import RegistrationRecord from "./RegistrationRecord";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export default function ConfirmedRegistrantCard({
  registration,
  singles,
  onUnregister,
}: {
  registration: Registration;
  singles: boolean;
  onUnregister: (userId: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-2 flex items-center justify-between gap-2"
      style={{ background: "var(--mint-50)" }}
    >
      <div className="min-w-0 space-y-1">
        <RegistrantIdentity registration={registration} singles={singles} />
        <RegistrationRecord registration={registration} />
      </div>
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
