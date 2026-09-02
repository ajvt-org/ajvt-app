"use client";

import { Suspense, useState } from "react";
import { useActivitiesData } from "./useActivitiesData";
import { useActivityActions } from "./useActivityActions";
import { useRowControls } from "./useRowControls";
import { useActivityBulk } from "./useActivityBulk";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import {
  ACTIVITIES_VIEW_KEYS,
  matchesActivitiesView,
  readActivitiesView,
  writeActivitiesView,
} from "./activitiesView";
import ActivitiesHeader from "./ActivitiesHeader";
import ActivitiesFilters from "./ActivitiesFilters";
import ActivitiesList from "./ActivitiesList";
import ActivitiesSkeleton, { ListSkeleton, WorkSkeleton } from "./ActivitiesSkeleton";
import AttentionPanel from "./AttentionPanel";
import BulkBar from "./BulkBar";
import NewActivityDialog from "./NewActivityDialog";
import { activityRow as texts } from "@/lib/texts";

function AdminActivitiesPageInner() {
  const { activities, waiting, loading, reload } = useActivitiesData();
  const actions = useActivityActions(reload);
  const controls = useRowControls(reload);
  const bulk = useActivityBulk(reload);
  const [showCreate, setShowCreate] = useState(false);
  const { filters, go } = useAdminListUrlState("/admin/activities", {
    keys: ACTIVITIES_VIEW_KEYS,
    readFilters: readActivitiesView,
    writeFilters: writeActivitiesView,
  });

  const visible = activities.filter((a) => matchesActivitiesView(a, filters));

  return (
    <div className="admin-page space-y-3">
      <ActivitiesHeader onAdd={() => setShowCreate(true)} />

      {(loading || waiting.length > 0) && (
        <section aria-label={texts.regions.work}>
          {loading ? (
            <WorkSkeleton />
          ) : (
            <AttentionPanel
              rows={waiting}
              newestFirst={filters.waiting === "newest"}
              onOrderChange={(newestFirst) =>
                go({ ...filters, waiting: newestFirst ? "newest" : "" })
              }
              reload={reload}
            />
          )}
        </section>
      )}

      <section aria-label={texts.regions.filters}>
        <ActivitiesFilters filters={filters} onChange={go} />
      </section>

      <BulkBar
        count={bulk.picked.size}
        busy={bulk.busy}
        onClose={bulk.closeRegistration}
        onDelete={bulk.remove}
        onClear={bulk.clear}
      />

      <section aria-label={texts.regions.list}>
        {loading ? (
          <ListSkeleton />
        ) : (
          <ActivitiesList
            rows={visible}
            total={activities.length}
            controls={controls}
            picked={bulk.picked}
            onPick={bulk.toggle}
            onAdd={() => setShowCreate(true)}
          />
        )}
      </section>

      {showCreate && (
        <NewActivityDialog onCreate={actions.createActivity} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

export default function AdminActivitiesPage() {
  return (
    <Suspense fallback={<ActivitiesSkeleton />}>
      <AdminActivitiesPageInner />
    </Suspense>
  );
}
