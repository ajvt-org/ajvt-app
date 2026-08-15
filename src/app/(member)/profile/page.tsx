"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import MemberProfile from "@/components/MemberProfile";
import PageHeader from "@/components/PageHeader";
import PageLoading from "@/components/PageLoading";
import { useMembers } from "@/lib/useMembers";

// The account's own tab: who is on it, where each request stands, and the way
// out. The activities tab next door answers a different question — what is on
// and who may join it — and keeping them apart is what stopped one long page
// from being both.
export default function ProfilePage() {
  const router = useRouter();
  const { members, setMembers, loading, reload, logout } = useMembers();
  const [refreshing, setRefreshing] = useState(false);

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://chat.whatsapp.com/XXXXX";

  return (
    <div className="app-shell">
      <PageHeader
        title="حسابي"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setRefreshing(true);
                reload().finally(() => setRefreshing(false));
              }}
              disabled={refreshing}
              aria-label="تحديث"
              className="btn btn-icon"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
            >
              <Icon name="refresh" className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
            >
              خروج
            </button>
          </div>
        }
      />

      {loading ? (
        <PageLoading />
      ) : (
        <div className="flex-1 px-5 py-6 space-y-5">
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
            <>
              <button onClick={() => router.push("/form")} className="btn btn-outline fade-up">
                <IconLabel name="plus">إضافة عضو آخر</IconLabel>
              </button>

              {members.map((member, i) => (
                <div key={member.id} className="space-y-4">
                  {members.length > 1 && (
                    <h2 className="font-black text-lg pt-2" style={{ color: "var(--text-main)" }}>
                      <IconLabel name="user">{member.fullName}</IconLabel>
                    </h2>
                  )}
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
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
