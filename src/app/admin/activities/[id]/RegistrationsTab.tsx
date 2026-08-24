"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ActivityRegistrationsPanel from "../ActivityRegistrationsPanel";
import { useRegistrationActions } from "../useRegistrationActions";
import type { MemberOption } from "../activityTypes";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

interface RawMember {
  id: string;
  fullName: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  user: { phone: string } | null;
}

export default function RegistrationsTab({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const actions = useRegistrationActions(onChanged);

  useEffect(() => {
    api
      .get<{ members: RawMember[] }>("/api/admin/members")
      .then((data) =>
        setMembers(
          (data.members || []).map((m) => ({
            id: m.id,
            fullName: m.fullName,
            phone: m.user?.phone ?? null,
            status: m.status,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <div className="card p-4">
      <ActivityRegistrationsPanel
        activityId={activity.id}
        registrations={activity.registrations}
        members={members}
        actionLoading={actions.actionLoading}
        onReview={actions.reviewRegistration}
        onRegister={actions.registerMember}
        onUnregister={actions.unregisterMember}
      />
    </div>
  );
}
