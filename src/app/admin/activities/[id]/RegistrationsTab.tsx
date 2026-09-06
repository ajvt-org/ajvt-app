"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ActivityRegistrationsPanel from "../ActivityRegistrationsPanel";
import { useRegistrationActions } from "../useRegistrationActions";
import type { MemberOption } from "../activityTypes";
import { isSinglesActivity } from "@/lib/entrant";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

export default function RegistrationsTab({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const actions = useRegistrationActions(onChanged);

  useEffect(() => {
    api
      .get<{ members: MemberOption[] }>("/api/admin/members/options")
      .then((data) => setMembers(data.members || []))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, []);

  return (
    <div className="card p-4">
      <ActivityRegistrationsPanel
        activityId={activity.id}
        registrations={activity.registrations}
        members={members}
        loadingMembers={loadingMembers}
        teams={activity.teams}
        singles={isSinglesActivity(activity)}
        actionLoading={actions.actionLoading}
        onReview={actions.reviewRegistration}
        onRegister={actions.registerMember}
        onUnregister={actions.unregisterMember}
      />
    </div>
  );
}
