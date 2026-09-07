"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import ChangePassword from "@/components/ChangePassword";
import IconLabel from "@/components/IconLabel";
import MemberInfoCard from "@/components/MemberInfoCard";
import MemberProfile from "@/components/MemberProfile";
import NotificationsToggle from "@/components/NotificationsToggle";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import PaymentReceipts from "@/components/PaymentReceipts";
import ProfileSection from "@/components/ProfileSection";
import SurplusVisibility from "@/components/SurplusVisibility";
import { myProfile as texts } from "@/lib/texts";
import { useMember } from "@/lib/useMember";
import { useNameBehindHeader } from "@/lib/useNameBehindHeader";

export default function ProfilePage() {
  const router = useRouter();
  const { member, setMember, currentYear, loading, reload, logout } = useMember();
  const headings = useMemo(
    () => (member ? [{ id: member.id, label: member.fullName }] : []),
    [member],
  );
  const { bind, behind } = useNameBehindHeader(headings);

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://chat.whatsapp.com/XXXXX";
  const active = member?.status === "ACTIVE";

  return (
    <div className="app-shell">
      <PageHeader title={behind ?? texts.title} />

      {loading ? (
        <PageLoading />
      ) : (
        <div className="flex-1 px-5 py-6 space-y-6">
          <MemberProfile
            member={member}
            currentYear={currentYear}
            whatsappLink={whatsappLink}
            onPhotoUpdated={(photo) => setMember((prev) => (prev ? { ...prev, photo } : prev))}
            onReload={reload}
            nameRef={member ? bind(member.id) : undefined}
          />

          <ProfileSection title={texts.groups.payments}>
            {member && (
              <SurplusVisibility
                memberId={member.id}
                memberName={member.fullName}
                supportAmount={member.supportAmount}
                anonymous={member.surplusAnonymous}
                onChanged={(anonymous) =>
                  setMember((prev) => (prev ? { ...prev, surplusAnonymous: anonymous } : prev))
                }
              />
            )}
            {member && <PaymentReceipts />}
          </ProfileSection>

          <ProfileSection title={texts.groups.details}>
            {member && (
              <MemberInfoCard
                member={member}
                onCard={Boolean(active && member.memberNumber)}
                onEdit={active ? undefined : () => router.push(`/membership?id=${member.id}`)}
              />
            )}
          </ProfileSection>

          <ProfileSection title={texts.groups.settings}>
            <NotificationsToggle awaitingDecision={member?.status === "PENDING"} />
            <ChangePassword />
            <button
              onClick={logout}
              className="btn"
              style={{ background: "transparent", color: "var(--text-muted)" }}
            >
              <IconLabel name="logout">{texts.logout}</IconLabel>
            </button>
          </ProfileSection>
        </div>
      )}
    </div>
  );
}
