"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PhotoUpload from "@/components/PhotoUpload";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { toThumbUrl } from "@/lib/utils";
import { activityForm as texts } from "@/lib/texts";

export default function ActivityHeaderPhoto({
  activityId,
  photo,
  isVolunteer,
  onSaved,
}: {
  activityId: string;
  photo: string | null;
  isVolunteer: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [error, setError] = useState("");

  async function saveOnPick(filename: string) {
    setError("");
    try {
      await api.patch(`/api/admin/activities/${activityId}`, { photo: filename });
      await onSaved();
      showToast(texts.photoSaved);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="shrink-0">
      <PhotoUpload
        photo={photo ? toThumbUrl(photo) : null}
        imageUrlPrefix="/api/files/activity"
        variant="tile"
        bare
        label={texts.activityPhoto}
        placeholderIcon={isVolunteer ? "handshake" : "trophy"}
        onUpload={saveOnPick}
      />
      {error && (
        <p className="text-xs font-semibold mt-1" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
    </div>
  );
}
