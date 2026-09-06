"use client";

import IconLabel from "@/components/IconLabel";
import PersonIdentity from "./PersonIdentity";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export default function RegistrantIdentity({
  registration,
  singles,
}: {
  registration: Registration;
  singles?: boolean;
}) {
  const { member, team } = registration;

  if (singles) return <PersonIdentity person={member} />;

  return (
    <PersonIdentity
      person={member}
      detail={
        <IconLabel name="users" size={11}>
          {team ? team.name : texts.noTeam}
        </IconLabel>
      }
    />
  );
}
