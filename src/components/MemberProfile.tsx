"use client";

import { useRouter } from "next/navigation";
import IconLabel from "@/components/IconLabel";
import MemberCard from "@/components/MemberCard";
import MemberIdentity from "@/components/MemberIdentity";
import MemberInfoCard from "@/components/MemberInfoCard";
import MemberRejected from "@/components/MemberRejected";
import MemberStatusCard from "@/components/MemberStatusCard";
import StatusTimeline from "@/components/StatusTimeline";
import type { MemberData } from "@/lib/useMember";

// Everything about one person on the account, in the order they need it.
//
// A request still moving is about what happens next, so it leads with the
// decision and the stages. An accepted one is about being a member, so it
// leads with the card they show and the group they join, and the stages drop
// out entirely — the acceptance date moves into the details instead.
export default function MemberProfile({
  member,
  whatsappLink,
  delayIndex,
  onPhotoUpdated,
  onReload,
  nameRef,
}: {
  member: MemberData;
  whatsappLink: string;
  delayIndex: number;
  onPhotoUpdated: (photo: string | null) => void;
  onReload: () => void;
  nameRef?: (el: HTMLElement | null) => void;
}) {
  const router = useRouter();
  const delayClass = delayIndex === 0 ? "" : "delay-1";
  const active = member.status === "ACTIVE";

  return (
    <div className={`fade-up ${delayClass} space-y-4`}>
      <MemberIdentity member={member} onPhotoUpdated={onPhotoUpdated} nameRef={nameRef} />

      {!active && (
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

      {active && (
        <>
          <MemberCard
            fullName={member.fullName}
            age={member.age}
            memberNumber={member.memberNumber}
            verifyToken={member.verifyToken}
            createdAt={member.createdAt}
            photo={member.photo}
          />

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
          >
            <IconLabel name="whatsapp">انضم إلى مجموعة الواتساب</IconLabel>
          </a>
        </>
      )}

      <MemberInfoCard
        member={member}
        onEdit={
          member.status === "PENDING" ? () => router.push(`/form?id=${member.id}`) : undefined
        }
      />
    </div>
  );
}
