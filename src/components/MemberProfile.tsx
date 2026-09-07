"use client";

import { useRouter } from "next/navigation";
import MemberCard from "@/components/MemberCard";
import MemberIdentity from "@/components/MemberIdentity";
import MemberRejected from "@/components/MemberRejected";
import MemberStatusCard from "@/components/MemberStatusCard";
import MembershipStanding from "@/components/MembershipStanding";
import NoMembershipCard from "@/components/NoMembershipCard";
import ProfileSection from "@/components/ProfileSection";
import StatusTimeline from "@/components/StatusTimeline";
import { withFrom } from "@/lib/backLink";
import { myProfile as texts } from "@/lib/texts";
import type { MemberData } from "@/lib/useMember";

export default function MemberProfile({
  member,
  currentYear,
  onPhotoUpdated,
  onReload,
  nameRef,
}: {
  member: MemberData | null;
  currentYear: number | null;
  onPhotoUpdated: (photo: string | null) => void;
  onReload: () => void;
  nameRef?: (el: HTMLElement | null) => void;
}) {
  const router = useRouter();
  const active = member?.status === "ACTIVE";

  return (
    <div className="fade-up space-y-6">
      {member && (
        <MemberIdentity member={member} onPhotoUpdated={onPhotoUpdated} nameRef={nameRef} />
      )}

      <ProfileSection title={texts.groups.membership}>
        {!member && (
          <NoMembershipCard onStart={() => router.push(withFrom("/membership", "/profile"))} />
        )}

        {member && !active && (
          <>
            <MemberStatusCard status={member.status} />
            {member.status === "REJECTED" && <MemberRejected member={member} onReload={onReload} />}
            <StatusTimeline
              status={member.status}
              createdAt={member.createdAt}
              updatedAt={member.updatedAt}
            />
          </>
        )}

        {member && active && <MembershipStanding member={member} currentYear={currentYear} />}

        {member && active && (
          <MemberCard
            fullName={member.fullName}
            village={member.village}
            age={member.age}
            memberNumber={member.memberNumber}
            verifyToken={member.verifyToken}
            createdAt={member.createdAt}
            photo={member.photo}
          />
        )}
      </ProfileSection>
    </div>
  );
}
