"use client";

import IconLabel from "@/components/IconLabel";
import { howRegistered, requestedOn } from "./registrationRecord";
import type { Registration } from "./activityTypes";

export default function RegistrationRecord({ registration }: { registration: Registration }) {
  return (
    <p
      className="text-[11px] flex items-center gap-2 flex-wrap"
      style={{ color: "var(--text-muted)" }}
    >
      <IconLabel name="user" size={11}>
        {howRegistered(registration)}
      </IconLabel>
      <span dir="ltr">{requestedOn(registration)}</span>
    </p>
  );
}
