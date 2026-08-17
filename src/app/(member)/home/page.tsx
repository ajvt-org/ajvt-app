"use client";

import ActivitiesSection from "@/components/ActivitiesSection";
import MyActivities from "@/components/MyActivities";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { toEligibleMember } from "@/components/activityTypes";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { useMember } from "@/lib/useMember";

export default function HomePage() {
  const { member, loading } = useMember();

  if (loading) {
    return (
      <div className="app-shell">
        <PageHeader title="الأنشطة" />
        <PageLoading />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title="الأنشطة" />

      <div className="flex-1 px-5 py-6 space-y-6">
        <MyActivities />

        <ActivitiesSection
          memberStatus={member?.status ?? null}
          quizAccess={
            member?.status === "ACTIVE" &&
            member.paidAmount !== null &&
            member.paidAmount >= MEMBERSHIP_FEE
          }
          eligibleMember={toEligibleMember(member)}
        />
      </div>
    </div>
  );
}
