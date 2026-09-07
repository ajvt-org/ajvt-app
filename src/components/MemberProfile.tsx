"use client";

import { useRouter } from "next/navigation";
import IconLabel from "@/components/IconLabel";
import MemberCard from "@/components/MemberCard";
import MemberIdentity from "@/components/MemberIdentity";
import MemberInfoCard from "@/components/MemberInfoCard";
import MemberRejected from "@/components/MemberRejected";
import MemberStatusCard from "@/components/MemberStatusCard";
import MembershipStanding from "@/components/MembershipStanding";
import StatusTimeline from "@/components/StatusTimeline";
import type { MemberData } from "@/lib/useMember";

export default function MemberProfile({
  member,
  currentYear,
  whatsappLink,
  delayIndex,
  onPhotoUpdated,
  onReload,
  nameRef,
}: {
  member: MemberData;
  currentYear: number | null;
  whatsappLink: string;
  delayIndex: number;
  onPhotoUpdated: (photo: string | null) => void;
  onReload: () => void;
  nameRef?: (el: HTMLElement | null) => void;
}) {
  const router = useRouter();
  const delayClass = delayIndex === 0 ? "" : "delay-1";
  const active = member.status === "ACTIVE";
  const onCard = active && Boolean(member.memberNumber);

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

      {active && <MembershipStanding member={member} currentYear={currentYear} />}

      {active && (
        <>
          <MemberCard
            fullName={member.fullName}
            village={member.village}
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
        onCard={onCard}
        onEdit={active ? undefined : () => router.push(`/membership?id=${member.id}`)}
      />
    </div>
  );
}
