"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import PageLoading from "@/components/PageLoading";
import IconLabel from "@/components/IconLabel";
import { useActivitiesData } from "./useActivitiesData";
import { useActivityActions } from "./useActivityActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import {
  ACTIVITIES_VIEW_KEYS,
  ACTIVITY_KINDS,
  matchesActivitiesView,
  readActivitiesView,
  writeActivitiesView,
} from "./activitiesView";
import ActivityRow from "./ActivityRow";
import AttentionPanel from "./AttentionPanel";
import { activityRow as texts } from "@/lib/texts";
import NewActivityDialog from "./NewActivityDialog";

function AdminActivitiesPageInner() {
  const { activities, loading, reload } = useActivitiesData();
  const actions = useActivityActions(reload);
  const [showCreate, setShowCreate] = useState(false);
  const { filters, go } = useAdminListUrlState("/admin/activities", {
    keys: ACTIVITIES_VIEW_KEYS,
    readFilters: readActivitiesView,
    writeFilters: writeActivitiesView,
  });

  if (loading) return <PageLoading />;

  const visible = activities.filter((a) => matchesActivitiesView(a, filters));

  return (
    <div className="admin-page space-y-3">
      <AttentionPanel
        newestFirst={filters.waiting === "newest"}
        onOrderChange={(newestFirst) => go({ ...filters, waiting: newestFirst ? "newest" : "" })}
      />

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="بحث باسم النشاط..."
          value={filters.q}
          onChange={(e) => go({ ...filters, q: e.target.value })}
          className="input input-sm flex-1"
          style={{ background: "white", minWidth: "10rem" }}
        />
        <Link
          href="/admin/activities/order"
          className="btn btn-sm text-xs font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="list">{texts.arrangeLink}</IconLabel>
        </Link>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm text-xs">
          <IconLabel name="plus">إضافة نشاط</IconLabel>
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {ACTIVITY_KINDS.map((k) => {
          const on = filters.kind === k.value;
          return (
            <button
              key={k.value}
              onClick={() => go({ ...filters, kind: k.value })}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{
                background: on ? "var(--mint-600)" : "white",
                color: on ? "white" : "var(--mint-700)",
                border: on ? "none" : "1px solid var(--mint-100)",
              }}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {activities.length === 0 ? "لا توجد أنشطة بعد" : "لا يطابق أي نشاط هذا البحث"}
          </p>
          {activities.length === 0 && (
            <button onClick={() => setShowCreate(true)} className="btn btn-sm btn-primary mx-auto">
              <IconLabel name="plus">أضف أول نشاط</IconLabel>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <ActivityRow key={a.id} activity={a} />
          ))}
        </div>
      )}

      {showCreate && (
        <NewActivityDialog onCreate={actions.createActivity} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

export default function AdminActivitiesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminActivitiesPageInner />
    </Suspense>
  );
}
