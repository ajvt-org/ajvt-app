"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import ActivityDatesEditor from "../ActivityDatesEditor";
import ConvertTournamentCard from "./ConvertTournamentCard";
import ConvertCampaignCard from "./ConvertCampaignCard";
import DeleteActivityCard from "./DeleteActivityCard";
import ResetTournamentCard from "./ResetTournamentCard";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { activityForm as texts } from "@/lib/texts";

export default function DetailsTab({
  activity,
  onSaved,
}: {
  activity: ActivityDetail["activity"];
  onSaved: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description,
    capacity: activity.capacity === null ? "" : String(activity.capacity),
    whatsappLink: activity.whatsappLink ?? "",
    photo: activity.photo ?? "",
    isOpen: activity.isOpen,
    autoApprove: activity.autoApprove,
    showScorersAndCards: activity.showScorersAndCards,
  });

  async function save(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        whatsappLink: form.whatsappLink.trim() || null,
        photo: form.photo || null,
        isOpen: form.isOpen,
        autoApprove: form.autoApprove,
        showScorersAndCards: form.showScorersAndCards,
      });
      await onSaved();
      showToast(texts.saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          <IconLabel name="pencil">{texts.detailsHeading}</IconLabel>
        </p>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor="activity-title" className="block text-sm font-bold mb-1.5">
              {texts.title}
            </label>
            <input
              id="activity-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={100}
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="activity-description" className="block text-sm font-bold mb-1.5">
              {texts.description}
            </label>
            <textarea
              id="activity-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="input"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <label htmlFor="activity-capacity" className="block text-sm font-bold mb-1.5">
                {texts.capacity}
              </label>
              <input
                id="activity-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                placeholder={texts.noCapacity}
                className="input"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="activity-whatsapp" className="block text-sm font-bold mb-1.5">
                {texts.whatsappLink}
              </label>
              <input
                id="activity-whatsapp"
                value={form.whatsappLink}
                onChange={(e) => setForm((p) => ({ ...p, whatsappLink: e.target.value }))}
                dir="ltr"
                className="input"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm((p) => ({ ...p, isOpen: e.target.checked }))}
              className="w-4 h-4"
            />
            {texts.registrationOpen}
          </label>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.autoApprove}
                onChange={(e) => setForm((p) => ({ ...p, autoApprove: e.target.checked }))}
                className="w-4 h-4"
              />
              {texts.autoApprove}
            </label>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {texts.autoApproveHint}
            </p>
          </div>

          {activity.isTournament && (
            <div>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.showScorersAndCards}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, showScorersAndCards: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                {texts.showScorersAndCards}
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {texts.showScorersAndCardsHint}
              </p>
            </div>
          )}

          <div>
            <p className="block text-sm font-bold mb-1.5">{texts.photoHeading}</p>
            <PhotoUpload
              photo={form.photo || null}
              imageUrlPrefix="/api/files/activity"
              variant="cover"
              label={texts.activityPhoto}
              onUpload={(filename) => setForm((p) => ({ ...p, photo: filename }))}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
              <Icon name="warning" size={13} className="icon-inline" /> {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn btn-sm btn-primary">
            <IconLabel name="save">{saving ? "..." : texts.save}</IconLabel>
          </button>
        </form>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          <IconLabel name="calendar">{texts.datesHeading}</IconLabel>
        </p>
        <ActivityDatesEditor activity={activity} onSaved={onSaved} />
      </div>

      {!activity.isVolunteer && <ConvertTournamentCard activity={activity} onChanged={onSaved} />}
      {!activity.isTournament && <ConvertCampaignCard activity={activity} onChanged={onSaved} />}

      {activity.isTournament && <ResetTournamentCard activityId={activity.id} onReset={onSaved} />}

      <DeleteActivityCard activityId={activity.id} />
    </div>
  );
}
