"use client";

import { useRouter } from "next/navigation";
import IconLabel from "@/components/IconLabel";
import type { Activity } from "./activityTypes";

export default function ActivityActionsRow({
  activity,
  actionLoading,
  expanded,
  onToggleExpanded,
  onToggleTournament,
  onToggleOpen,
  onDelete,
}: {
  activity: Activity;
  actionLoading: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleTournament: () => void;
  onToggleOpen: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      {activity.isVolunteer ? null : activity.isTournament ? (
        <button
          onClick={() =>
            router.push(
              `/admin/tournament/${activity.id}?title=${encodeURIComponent(activity.title)}`,
            )
          }
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-700)", color: "white" }}
        >
          <IconLabel name="ball">إدارة البطولة</IconLabel>
        </button>
      ) : (
        <button
          onClick={onToggleTournament}
          disabled={actionLoading}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          <IconLabel name="ball">تحويل إلى بطولة</IconLabel>
        </button>
      )}
      <button
        onClick={onToggleOpen}
        disabled={actionLoading}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {activity.isVolunteer
          ? activity.isOpen
            ? "إخفاء من الصفحة الرئيسية"
            : "إظهار في الصفحة الرئيسية"
          : activity.isOpen
            ? "إغلاق التسجيل"
            : "فتح التسجيل"}
      </button>
      {!activity.isVolunteer && (
        <button
          onClick={onToggleExpanded}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {expanded ? "إخفاء المسجلين" : "إدارة المسجلين"}
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={actionLoading}
        className="text-xs px-3 py-1.5 rounded-lg font-bold mr-auto"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        🗑 حذف
      </button>
    </div>
  );
}
