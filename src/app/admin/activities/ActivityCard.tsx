"use client";

import Link from "next/link";
import PhotoUpload from "@/components/PhotoUpload";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import { counted } from "@/lib/arabicCount";
import { REQUEST, VOLUNTEER } from "@/lib/messages";
import { formatActivityDates } from "@/lib/activityDates";
import ActivityDatesEditor from "./ActivityDatesEditor";
import ActivityWhatsappLinkEditor from "./ActivityWhatsappLinkEditor";
import ActivityActionsRow from "./ActivityActionsRow";
import ActivityRegistrationsPanel from "./ActivityRegistrationsPanel";
import type { Activity, MemberOption } from "./activityTypes";

export default function ActivityCard({
  activity,
  index,
  total,
  members,
  expanded,
  actionLoading,
  reorderLoading,
  onToggleExpanded,
  onMove,
  onUpdatePhoto,
  onToggleTournament,
  onToggleOpen,
  onDelete,
  onSaveWhatsappLink,
  onDatesSaved,
  onReview,
  onRegister,
  onUnregister,
}: {
  activity: Activity;
  index: number;
  total: number;
  members: MemberOption[];
  expanded: boolean;
  actionLoading: boolean;
  reorderLoading: boolean;
  onToggleExpanded: () => void;
  onMove: (direction: "up" | "down") => void;
  onUpdatePhoto: (photo: string) => void;
  onToggleTournament: () => void;
  onToggleOpen: () => void;
  onDelete: () => void;
  onSaveWhatsappLink: (activityId: string, link: string) => Promise<boolean>;
  onDatesSaved: () => void;
  onReview: (
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ) => Promise<boolean>;
  onRegister: (activityId: string, memberId: string) => Promise<boolean>;
  onUnregister: (activityId: string, memberId: string) => void;
}) {
  const a = activity;
  const confirmedCount = a.registrations.filter((r) => r.status !== "REJECTED").length;
  const pendingCount = a.registrations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
          ترتيب الظهور في الصفحة الرئيسية
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={reorderLoading || index === 0}
            aria-label="نقل لأعلى"
            className="w-7 h-7 rounded-lg disabled:opacity-30 flex items-center justify-center"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="arrowUp" size={15} />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={reorderLoading || index === total - 1}
            aria-label="نقل لأسفل"
            className="w-7 h-7 rounded-lg disabled:opacity-30 flex items-center justify-center"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="arrowDown" size={15} />
          </button>
        </div>
      </div>
      <div className="mb-3">
        <PhotoUpload
          photo={a.photo}
          imageUrlPrefix="/api/files/activity"
          variant="avatar"
          label={a.isTournament ? "شعار البطولة" : "صورة النشاط"}
          placeholderIcon="image"
          onUpload={onUpdatePhoto}
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/activities/${a.id}`}
            className="font-bold text-sm block"
            style={{ color: "var(--mint-700)" }}
          >
            {a.title}
          </Link>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {a.description}
          </p>
          <div
            className="flex items-center gap-3 text-xs mt-2 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {formatActivityDates(a) && (
              <span>
                <Icon name="calendar" size={13} className="icon-inline" />{" "}
                <NumericRanges>{formatActivityDates(a)!}</NumericRanges>
              </span>
            )}
            {!a.isVolunteer && (
              <span>
                <Icon name="users" size={13} className="icon-inline" /> {confirmedCount}
                {a.capacity !== null ? `/${a.capacity}` : ""}
              </span>
            )}
            {a.isVolunteer && confirmedCount > 0 && (
              <span className="badge badge-active">
                <IconLabel name="heart" size={11}>
                  {counted(confirmedCount, VOLUNTEER)}
                </IconLabel>
              </span>
            )}
            {!a.isVolunteer && pendingCount > 0 && (
              <span className="badge badge-pending">
                <IconLabel name="clock" size={11}>
                  {counted(pendingCount, REQUEST)} بانتظار المراجعة
                </IconLabel>
              </span>
            )}
            <span className={`badge ${a.isOpen ? "badge-active" : "badge-rejected"}`}>
              {a.isOpen ? "ظاهر" : "مخفي"}
            </span>
            {a.isTournament && (
              <span className="badge badge-pending">
                <IconLabel name="ball" size={11}>
                  بطولة
                </IconLabel>
              </span>
            )}
            {a.isVolunteer && (
              <span className="badge badge-pending">
                <IconLabel name="handshake" size={11}>
                  حملة تطوعية
                </IconLabel>
              </span>
            )}
          </div>
          {a.isVolunteer && (
            <div className="mt-2">
              <ActivityWhatsappLinkEditor
                activityId={a.id}
                link={a.whatsappLink}
                saving={actionLoading}
                onSave={onSaveWhatsappLink}
              />
            </div>
          )}
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
            <ActivityDatesEditor activity={a} onSaved={onDatesSaved} />
          </div>
        </div>
      </div>

      <ActivityActionsRow
        activity={a}
        actionLoading={actionLoading}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onToggleTournament={onToggleTournament}
        onToggleOpen={onToggleOpen}
        onDelete={onDelete}
      />

      {expanded && !a.isVolunteer && (
        <ActivityRegistrationsPanel
          activity={a}
          members={members}
          actionLoading={actionLoading}
          onReview={onReview}
          onRegister={onRegister}
          onUnregister={onUnregister}
        />
      )}
    </div>
  );
}
