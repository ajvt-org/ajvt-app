"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { STATUS_CLASS, STATUS_LABEL, type Activity, type EligibleMember } from "./activityTypes";

// One row per person on the account, because a phone can carry several
// membership records — "no cap on how many", says the route that creates
// them. Repeating this inside every card in a list made an account look like
// several accounts, so it lives on the activity's own page instead.
export default function ActivityRegistrations({
  activity,
  eligibleMembers,
  onReload,
}: {
  activity: Activity;
  eligibleMembers: EligibleMember[];
  onReload: () => void;
}) {
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const showToast = useToast();

  function regFor(member: EligibleMember) {
    return member.registrations.find((r) => r.activityId === activity.id) || null;
  }

  function teamFor(member: EligibleMember) {
    return member.teamMemberships.find((tm) => tm.activityId === activity.id) || null;
  }

  async function pickTeam(memberId: string, teamId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.post(`/api/teams/${teamId}/join`, { memberId });
      showToast("تم إرسال طلب الانضمام — بانتظار موافقة المشرف");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function leaveTeam(memberId: string, teamId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.del(`/api/teams/${teamId}/join`, { memberId });
      showToast("تم إلغاء الطلب");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;

  async function register(memberId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.post("/api/activities/register", {
        activityId: activity.id,
        memberId,
      });
      showToast(activity.isVolunteer ? "تم تسجيلك كمتطوع 💚" : "تم التسجيل في النشاط");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  function registerVolunteer(memberId: string) {
    // Open the WhatsApp group synchronously in the click handler — a browser popup
    // blocker would kill the redirect if it happened after the register() await below.
    if (activity.whatsappLink) window.open(activity.whatsappLink, "_blank", "noopener,noreferrer");
    register(memberId);
  }

  async function cancelPending(memberId: string) {
    try {
      await fetch("/api/activities/register", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, activityId: activity.id }),
      });
      showToast("تم إلغاء الطلب");
      onReload();
    } catch {
      // best-effort — the member can just try again
    }
  }

  return (
    <>
      {/* One tap per person — no payment, no form: membership already covers it */}
      <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
        {eligibleMembers.map((m) => {
          const r = regFor(m);
          const settled = r && r.status !== "REJECTED";
          return (
            <div key={m.id}>
              <div className="flex items-center justify-between gap-3 text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <PlayerAvatar photo={m.photo} fullName={m.fullName} size={26} bg="copper" />
                  <span className="truncate" style={{ color: "var(--text-main)" }}>
                    {m.fullName}
                  </span>
                </div>
                {settled ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${STATUS_CLASS[r!.status]}`}>
                      <IconLabel name={STATUS_LABEL[r!.status].icon} size={11}>
                        {STATUS_LABEL[r!.status].text}
                      </IconLabel>
                    </span>
                    {r!.status === "PENDING" && (
                      <button
                        onClick={() => cancelPending(m.id)}
                        className="font-bold"
                        style={{ color: "#991b1b" }}
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                ) : activity.isOpen && !full ? (
                  <button
                    onClick={() =>
                      activity.isVolunteer ? registerVolunteer(m.id) : register(m.id)
                    }
                    disabled={busyMemberId === m.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    {busyMemberId === m.id ? (
                      "..."
                    ) : r?.status === "REJECTED" ? (
                      <IconLabel name="refresh">إعادة المحاولة</IconLabel>
                    ) : activity.isVolunteer ? (
                      <IconLabel name="handshake">تطوع</IconLabel>
                    ) : (
                      <IconLabel name="pencil">سجّل</IconLabel>
                    )}
                  </button>
                ) : (
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {!activity.isOpen ? "التسجيل مغلق" : "اكتمل العدد"}
                  </span>
                )}
              </div>
              {r?.status === "REJECTED" && r.rejectionReason && (
                <p className="text-xs mr-8" style={{ color: "#991b1b" }}>
                  سبب الرفض السابق: {r.rejectionReason}
                </p>
              )}
              {r?.status === "ACTIVE" &&
                activity.isTournament &&
                activity.teams.length > 0 &&
                (() => {
                  const myTeam = teamFor(m);
                  const locked = myTeam?.status === "ACTIVE";
                  return (
                    <div className="mr-8 mt-1.5">
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        <Icon name="flag" size={12} className="icon-inline" />{" "}
                        {locked ? "فريقك:" : "اختر فريقك (اختياري):"}
                      </p>
                      {locked ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="badge badge-active">
                            <IconLabel name="check" size={11}>
                              {myTeam!.teamName}
                            </IconLabel>
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            تم التأكيد — لا يمكن تغييره
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activity.teams.map((t) => {
                            const mine = myTeam?.teamId === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => pickTeam(m.id, t.id)}
                                disabled={busyMemberId === m.id || mine}
                                className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                style={{
                                  background: mine ? "var(--mint-600)" : "white",
                                  color: mine ? "white" : "var(--mint-700)",
                                  border: "1px solid var(--mint-200)",
                                }}
                              >
                                {mine ? "⏳ " : ""}
                                {t.name}
                              </button>
                            );
                          })}
                          {myTeam && (
                            <>
                              <span className="badge badge-pending" style={{ fontSize: "10px" }}>
                                ⏳ بانتظار الموافقة
                              </span>
                              <button
                                onClick={() => leaveTeam(m.id, myTeam.teamId)}
                                disabled={busyMemberId === m.id}
                                className="text-xs font-bold"
                                style={{ color: "#991b1b" }}
                              >
                                إلغاء الطلب
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
      {error && (
        <div
          className="p-2.5 rounded-xl text-xs font-semibold mt-2"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}
    </>
  );
}
