"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import MemberCard from "@/components/MemberCard";
import MemberInfoCard from "@/components/MemberInfoCard";
import MemberRejected from "@/components/MemberRejected";
import MemberStatusCard from "@/components/MemberStatusCard";
import NotificationsButton from "@/components/NotificationsButton";
import PhotoUpload from "@/components/PhotoUpload";
import StatusTimeline from "@/components/StatusTimeline";
import type { MemberData } from "@/lib/useMembers";

// Everything about one person on the account: where their request stands,
// their photo, their card once approved, and the details they submitted. An
// account can hold several, so the profile stacks one of these per person.
export default function MemberProfile({
  member,
  whatsappLink,
  delayIndex,
  onPhotoUpdated,
  onReload,
}: {
  member: MemberData;
  whatsappLink: string;
  delayIndex: number;
  onPhotoUpdated: (photo: string | null) => void;
  onReload: () => void;
}) {
  const router = useRouter();
  const delayClass = delayIndex === 0 ? "" : "delay-1";

  return (
    <div className={`fade-up ${delayClass} space-y-4`}>
      <MemberStatusCard status={member.status} />
      <StatusTimeline
        status={member.status}
        createdAt={member.createdAt}
        updatedAt={member.updatedAt}
      />

      <div className="card p-4">
        <PhotoUpload
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
      </div>

      {member.status === "PENDING" && (
        <>
          <NotificationsButton />
          <div className="card p-4 flex items-center justify-between gap-3">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              لاحظت خطأ في بياناته؟
            </p>
            <button
              onClick={() => router.push(`/form?id=${member.id}`)}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              تعديل الطلب
            </button>
          </div>
        </>
      )}

      {member.status === "REJECTED" && <MemberRejected member={member} onReload={onReload} />}

      {member.status === "ACTIVE" && (
        <>
          <NotificationsButton dismissible />

          <MemberCard
            fullName={member.fullName}
            age={member.age}
            memberNumber={member.memberNumber}
            createdAt={member.createdAt}
            photo={member.photo}
          />

          <div className="card p-5">
            <h3 className="font-bold mb-3" style={{ color: "var(--text-main)" }}>
              <IconLabel name="whatsapp" color="#25D366">
                انضم إلى مجموعة الواتساب
              </IconLabel>
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              تم قبول العضوية. انقر أدناه للانضمام إلى مجموعة الواتساب الرسمية.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <Icon name="whatsapp" />
              انضم إلى المجموعة
            </a>
          </div>

          <div className="card p-5">
            <h3 className="font-bold mb-3" style={{ color: "var(--text-main)" }}>
              <IconLabel name="heart" filled color="var(--mint-600)">
                ادعم الرابطة
              </IconLabel>
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              يمكنك التبرع للرابطة في أي وقت باسمك، وسيظهر تبرعك في لوحة شرف المتبرعين بعد مراجعته.
            </p>
            <button
              onClick={() => router.push(`/donate?memberId=${member.id}`)}
              className="btn"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="heart" filled>
                تبرّع للرابطة الآن
              </IconLabel>
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="text-xs font-bold mt-3 w-full text-center"
              style={{ color: "var(--mint-600)" }}
            >
              <IconLabel name="trophy">شاهد لوحة شرف المتبرعين</IconLabel>
            </button>
          </div>
        </>
      )}

      <MemberInfoCard member={member} />
    </div>
  );
}
