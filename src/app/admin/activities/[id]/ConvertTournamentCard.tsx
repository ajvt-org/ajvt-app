"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

export default function ConvertTournamentCard({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isTournament: !activity.isTournament,
      });
      await onChanged();
      showToast(activity.isTournament ? "لم يعد النشاط بطولة" : "أصبح النشاط بطولة");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">وضع البطولة</IconLabel>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {activity.isTournament
            ? "هذا النشاط بطولة، له فرق ومباريات وترتيب."
            : "حوّل النشاط إلى بطولة ليحصل على فرق ومباريات وترتيب."}
        </p>
      </div>
      <button onClick={toggle} disabled={busy} className="btn btn-sm btn-ghost shrink-0">
        {busy ? "..." : activity.isTournament ? "إلغاء وضع البطولة" : "تحويل إلى بطولة"}
      </button>
    </div>
  );
}
