"use client";

import ActivitiesSection from "@/components/ActivitiesSection";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { toEligibleMember } from "@/components/activityTypes";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { useMember } from "@/lib/useMember";

// The activities tab for a signed-in account. It knows the membership on the
// account only well enough to say whether it may register; everything about it
// lives in the profile tab.
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

      <div className="flex-1 px-5 py-6">
        <ActivitiesSection
          memberStatus={member?.status ?? null}
          // The quiz is a paid-membership perk — same "منتسب" bar as anything
          // else gated behind an approved, fee-paid membership.
          quizAccess={
            member?.status === "ACTIVE" &&
            member.paidAmount !== null &&
            member.paidAmount >= MEMBERSHIP_FEE
          }
          // Only a fully-approved member can register for events — the
          // membership fee/review comes first, activities come after.
          eligibleMember={toEligibleMember(member)}
        />
      </div>
    </div>
  );
}
