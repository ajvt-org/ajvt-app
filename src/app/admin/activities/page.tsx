"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import PageLoading from "@/components/PageLoading";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useActivitiesData } from "./useActivitiesData";
import { useActivityActions } from "./useActivityActions";
import { useRowControls } from "./useRowControls";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import {
  ACTIVITIES_VIEW_KEYS,
  ACTIVITY_STATES,
  ACTIVITY_TYPES,
  matchesActivitiesView,
  readActivitiesView,
  writeActivitiesView,
} from "./activitiesView";
import { splitByStage } from "./activitiesList";
import ActivityRow, { type RowControls } from "./ActivityRow";
import AttentionPanel from "./AttentionPanel";
import FilterChips from "./FilterChips";
import { activityRow as texts } from "@/lib/texts";
import NewActivityDialog from "./NewActivityDialog";
import type { Activity } from "./activityTypes";

function Rows({ rows, controls }: { rows: Activity[]; controls: RowControls }) {
  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <ActivityRow key={a.id} activity={a} controls={controls} />
      ))}
    </div>
  );
}

function AdminActivitiesPageInner() {
  const { activities, loading, reload } = useActivitiesData();
  const actions = useActivityActions(reload);
  const controls = useRowControls(reload);
  const [showCreate, setShowCreate] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const { filters, go } = useAdminListUrlState("/admin/activities", {
    keys: ACTIVITIES_VIEW_KEYS,
    readFilters: readActivitiesView,
    writeFilters: writeActivitiesView,
  });

  if (loading) return <PageLoading />;

  const visible = activities.filter((a) => matchesActivitiesView(a, filters));
  const { current, finished } = splitByStage(visible);

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

      <div className="space-y-1.5">
        <FilterChips
          options={ACTIVITY_TYPES}
          value={filters.type}
          onPick={(type) => go({ ...filters, type })}
          label={texts.filters.anyType}
        />
        <FilterChips
          options={ACTIVITY_STATES}
          value={filters.state}
          onPick={(state) => go({ ...filters, state })}
          label={texts.filters.anyState}
        />
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
        <div className="space-y-3">
          {current.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
                {texts.sections.current}
              </p>
              <Rows rows={current} controls={controls} />
            </div>
          )}

          {finished.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowFinished((shown) => !shown)}
                aria-expanded={showFinished}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: "var(--mint-700)" }}
              >
                <Icon name={showFinished ? "chevronUp" : "chevronDown"} size={13} />
                {texts.sections.finished(finished.length)}
              </button>
              {showFinished && <Rows rows={finished} controls={controls} />}
            </div>
          )}
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
