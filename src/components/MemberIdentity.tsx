"use client";

import PhotoUpload from "@/components/PhotoUpload";
import { STATUS } from "@/lib/memberStatus";
import type { MemberData } from "@/lib/useMembers";

export default function MemberIdentity({
  member,
  onPhotoUpdated,
  nameRef,
}: {
  member: MemberData;
  onPhotoUpdated: (photo: string | null) => void;
  nameRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <PhotoUpload
        variant="hero"
        photo={member.photo}
        onUpload={async (filename) => {
          const res = await fetch(`/api/members/${member.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photo: filename }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "فشل حفظ الصورة");
          onPhotoUpdated(data.photo);
        }}
      />

      <h2 ref={nameRef} className="font-black text-lg mt-1" style={{ color: "var(--text-main)" }}>
        {member.fullName}
      </h2>

      <div className="flex items-center gap-2">
        <span className={`badge ${STATUS[member.status].badgeClass}`}>
          {STATUS[member.status].label}
        </span>
        {member.memberNumber && member.status === "ACTIVE" && (
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }} dir="ltr">
            {member.memberNumber}
          </span>
        )}
      </div>
    </div>
  );
}
