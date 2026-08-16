"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import ChangePassword from "@/components/ChangePassword";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import MemberProfile from "@/components/MemberProfile";
import NotificationsToggle from "@/components/NotificationsToggle";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { useMembers } from "@/lib/useMembers";
import { useNameBehindHeader } from "@/lib/useNameBehindHeader";

// The account's own tab: who is on it, where each request stands, and the way
// out. Supporting the association has a tab of its own, so it is not repeated
// here, and there is no refresh button — pulling the page down reloads it.
export default function ProfilePage() {
  const router = useRouter();
  const { members, setMembers, loading, reload, logout } = useMembers();
  const headings = useMemo(() => members.map((m) => ({ id: m.id, label: m.fullName })), [members]);
  const { bind, behind } = useNameBehindHeader(headings);

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://chat.whatsapp.com/XXXXX";

  return (
    <div className="app-shell">
      <PageHeader title={behind ?? "حسابي"} />

      {loading ? (
        <PageLoading />
      ) : (
        <div className="flex-1 px-5 py-6 space-y-6">
          {members.length === 0 ? (
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
              <button onClick={() => router.push("/form")} className="btn btn-primary">
                <ArrowLabel>تعبئة استمارة الانضمام</ArrowLabel>
              </button>
            </div>
          ) : (
            members.map((member, i) => (
              <div
                key={member.id}
                className={i === 0 ? undefined : "pt-6"}
                style={i === 0 ? undefined : { borderTop: "1px solid var(--mint-200)" }}
              >
                <MemberProfile
                  member={member}
                  whatsappLink={whatsappLink}
                  delayIndex={i}
                  onPhotoUpdated={(photo) => {
                    setMembers((prev) =>
                      prev.map((m) => (m.id === member.id ? { ...m, photo } : m)),
                    );
                  }}
                  onReload={reload}
                  nameRef={bind(member.id)}
                />
              </div>
            ))
          )}

          <div className="space-y-3 pt-2">
            <NotificationsToggle awaitingDecision={members.some((m) => m.status === "PENDING")} />
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
