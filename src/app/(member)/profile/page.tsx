"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import ChangePassword from "@/components/ChangePassword";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import MemberProfile from "@/components/MemberProfile";
import NotificationsToggle from "@/components/NotificationsToggle";
import PaymentReceipts from "@/components/PaymentReceipts";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import SurplusVisibility from "@/components/SurplusVisibility";
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

  return (
    <div className="app-shell">
      <PageHeader title={behind ?? "حسابي"} />

      {loading ? (
        <PageLoading />
      ) : (
        <div className="flex-1 px-5 py-6 space-y-6">
          {member ? (
            <MemberProfile
              member={member}
              currentYear={currentYear}
              whatsappLink={whatsappLink}
              delayIndex={0}
              onPhotoUpdated={(photo) => setMember((prev) => (prev ? { ...prev, photo } : prev))}
              onReload={reload}
              nameRef={bind(member.id)}
            />
          ) : (
            <div className="card p-6 text-center fade-up">
              <div className="mb-3 flex justify-center">
                <Icon name="list" size={40} />
              </div>
              <h2 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>
                لم تقدم طلب انضمام بعد
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                أكمل استمارة الانضمام للانضمام إلى رابطة شباب قرية التاكلالت
              </p>
              <button onClick={() => router.push("/membership")} className="btn btn-primary">
                <ArrowLabel>تعبئة استمارة الانضمام</ArrowLabel>
              </button>
            </div>
          )}

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

          <div className="space-y-3 pt-2">
            <NotificationsToggle awaitingDecision={member?.status === "PENDING"} />
            <ChangePassword />
            <button
              onClick={logout}
              className="btn"
              style={{ background: "transparent", color: "var(--text-muted)" }}
            >
              <IconLabel name="logout">تسجيل الخروج</IconLabel>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
