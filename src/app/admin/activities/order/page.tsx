"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ArrowLabel from "@/components/ArrowLabel";
import PageLoading from "@/components/PageLoading";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { arrangedGroups, moveWithinStage } from "@/lib/activityArrange";
import { activityRow as texts } from "@/lib/texts";
import { useActivitiesData } from "../useActivitiesData";
import type { Activity } from "../activityTypes";

function Row({
  activity,
  first,
  last,
  busy,
  onMove,
}: {
  activity: Activity;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "white" }}>
      <span className="min-w-0 flex-1 text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {activity.title}
      </span>
      <button
        onClick={() => onMove(-1)}
        disabled={first || busy}
        aria-label={texts.moveUp(activity.title)}
        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
        style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
      >
        <Icon name="chevronUp" size={15} />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={last || busy}
        aria-label={texts.moveDown(activity.title)}
        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
        style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
      >
        <Icon name="chevronDown" size={15} />
      </button>
    </div>
  );
}

export default function ActivityOrderPage() {
  const { activities, loading, reload } = useActivitiesData();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function move(id: string, direction: -1 | 1) {
    const changes = moveWithinStage(activities, id, direction);
    if (changes.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(
        changes.map((change) =>
          api.patch(`/api/admin/activities/${change.id}`, { order: change.order }),
        ),
      );
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading />;

  const groups = arrangedGroups(activities);

  return (
    <div className="admin-page space-y-3">
      <Link
        href="/admin/activities"
        className="text-sm font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">{texts.arrangeBack}</ArrowLabel>
      </Link>

      <div className="card p-4 space-y-1">
        <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          {texts.arrangeTitle}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.arrangeNote}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.arrangeEmpty}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.stage} className="card p-3 space-y-2">
            <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
              {texts.stages[group.stage]}
            </p>
            <div className="space-y-1.5">
              {group.rows.map((activity, index) => (
                <Row
                  key={activity.id}
                  activity={activity}
                  first={index === 0}
                  last={index === group.rows.length - 1}
                  busy={busy}
                  onMove={(direction) => move(activity.id, direction)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
