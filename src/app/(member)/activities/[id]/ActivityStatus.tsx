"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IconLabel from "@/components/IconLabel";
import ActivityRegistrations from "@/components/ActivityRegistrations";
import { toEligibleMember } from "@/components/activityTypes";
import type { Activity, EligibleMember } from "@/components/activityTypes";
import { activityPage as texts } from "@/lib/texts";

export default function ActivityStatus({ activity }: { activity: Activity }) {
  const router = useRouter();
  const [member, setMember] = useState<EligibleMember | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/user/me");
      if (res.status === 401) {
        setSignedIn(false);
        setMember(null);
        return;
      }
      const { members } = await res.json();
      setMember(toEligibleMember(members?.[0]));
      setSignedIn(true);
    } catch {
      setSignedIn(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [activity.id]);

  function reload() {
    load();
    router.refresh();
  }

  if (signedIn === null) return null;

  if (signedIn) {
    return member ? (
      <ActivityRegistrations activity={activity} member={member} onReload={reload} />
    ) : null;
  }

  if (activity.isVolunteer && activity.whatsappLink) {
    return (
      <a
        href={activity.whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whatsapp"
      >
        <IconLabel name="handshake">{texts.joinWhatsapp}</IconLabel>
      </a>
    );
  }

  return (
    <div className="space-y-2.5">
      <Link href={`/form?from=/activities/${activity.id}`} className="btn btn-copper">
        <IconLabel name="pencil">{texts.signUpCta}</IconLabel>
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(`/activities/${activity.id}`)}`}
        className="text-sm font-bold block text-center"
        style={{ color: "var(--mint-600)" }}
      >
        {texts.haveAccount}
      </Link>
    </div>
  );
}
