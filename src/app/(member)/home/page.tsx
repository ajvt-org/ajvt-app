"use client";

import ActivitiesSection from "@/components/ActivitiesSection";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { useMembers } from "@/lib/useMembers";

// The activities tab for a signed-in account. It knows the people on the
// account only well enough to say who may register; everything about them
// lives in the profile tab.
export default function HomePage() {
  const { members, loading } = useMembers();

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

      <div className="flex-1 px-5 py-6">
        <ActivitiesSection
          hasAnyMember={members.length > 0}
          hasPendingMember={members.some((m) => m.status === "PENDING")}
          // The quiz is a paid-membership perk — same "منتسب" bar as anything
          // else gated behind an approved, fee-paid membership.
          quizAccess={members.some(
            (m) => m.status === "ACTIVE" && m.paidAmount !== null && m.paidAmount >= MEMBERSHIP_FEE,
          )}
          // Only fully-approved members can register for events — the
          // membership fee/review comes first, activities come after.
          eligibleMembers={members
            .filter((m) => m.status === "ACTIVE")
            .map((m) => ({
              id: m.id,
              fullName: m.fullName,
              photo: m.photo,
              registrations: m.registrations.map((r) => ({
                activityId: r.activityId,
                status: r.status,
                rejectionReason: r.rejectionReason,
              })),
              teamMemberships: m.teamMemberships.map((tm) => ({
                teamId: tm.team.id,
                teamName: tm.team.name,
                activityId: tm.team.activityId,
                status: tm.status,
              })),
            }))}
        />
      </div>
    </div>
  );
}
