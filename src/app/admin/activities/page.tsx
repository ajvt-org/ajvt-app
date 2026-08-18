"use client";

import { Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import BarChart from "@/components/admin/BarChart";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useActivitiesData } from "./useActivitiesData";
import { useActivityActions } from "./useActivityActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { ACTIVITIES_VIEW_KEYS, readActivitiesView, writeActivitiesView } from "./activitiesView";
import ActivityCard from "./ActivityCard";
import NewActivityForm from "./NewActivityForm";

function AdminActivitiesPageInner() {
  const { activities, members, loading, reload } = useActivitiesData();
  const actions = useActivityActions(activities, reload);
  const { filters, go } = useAdminListUrlState("/admin/activities", {
    keys: ACTIVITIES_VIEW_KEYS,
    readFilters: readActivitiesView,
    writeFilters: writeActivitiesView,
  });

  if (loading) return <PageLoading />;

  return (
    <div className="admin-page space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          لا توجد أنشطة بعد — أضف أول نشاط أدناه
        </p>
      ) : (
        <>
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
              عدد المسجلين حسب النشاط
            </p>
            <BarChart
              data={activities.map((a) => ({
                label: a.title.slice(0, 6),
                value: a.registrations.filter((r) => r.status !== "REJECTED").length,
              }))}
            />
          </div>
          {activities.map((a, index) => (
            <ActivityCard
              key={a.id}
              activity={a}
              index={index}
              total={activities.length}
              members={members}
              expanded={filters.expanded === a.id}
              actionLoading={actions.actionLoading}
              reorderLoading={actions.reorderLoading}
              onToggleExpanded={() => go({ expanded: filters.expanded === a.id ? "" : a.id })}
              onMove={(direction) => actions.moveActivity(index, direction)}
              onUpdatePhoto={(photo) => actions.updateActivityPhoto(a.id, photo)}
              onToggleTournament={() => actions.toggleActivityTournament(a)}
              onToggleOpen={() => actions.toggleActivityOpen(a)}
              onDelete={() => actions.requestDeleteActivity(a.id)}
              onSaveWhatsappLink={actions.saveWhatsappLink}
              onDatesSaved={reload}
              onReview={actions.reviewRegistration}
              onRegister={actions.registerMember}
              onUnregister={actions.unregisterMember}
            />
          ))}
        </>
      )}

      <NewActivityForm onCreate={actions.createActivity} />

      {actions.deletingId && (
        <ConfirmDialog
          title="حذف النشاط"
          message="هل أنت متأكد من حذف هذا النشاط؟ سيتم إلغاء تسجيل جميع الأعضاء فيه."
          confirmLabel="حذف نهائي"
          danger
          loading={actions.actionLoading}
          onConfirm={actions.confirmDeleteActivity}
          onClose={actions.cancelDeleteActivity}
        />
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
