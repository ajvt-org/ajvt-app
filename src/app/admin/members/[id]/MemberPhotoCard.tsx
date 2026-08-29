"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ProfileSection from "@/components/admin/ProfileSection";
import { api, errorMessage } from "@/lib/api";
import { memberPhoto as texts } from "@/lib/texts";

const DANGER = { background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" } as const;
const CALM = { background: "var(--mint-100)", color: "var(--mint-700)" } as const;

export default function MemberPhotoCard({
  memberId,
  photo,
  locked,
  onChanged,
}: {
  memberId: string;
  photo: string | null;
  locked: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function send(what: string, body: Record<string, unknown>) {
    setBusy(what);
    setError("");
    try {
      await api.patch(`/api/admin/members/${memberId}`, body);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <ProfileSection icon="camera" title={texts.title}>
      <p className="text-sm font-bold" style={{ color: locked ? "#991b1b" : "var(--text-main)" }}>
        <IconLabel name={locked ? "ban" : "check"}>
          {locked ? texts.lockedNow : texts.openNow}
        </IconLabel>
      </p>
      {!photo && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      )}
      {photo && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.removeNote}
        </p>
      )}
      {!locked && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.lockNote}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {photo && (
          <button
            onClick={() => send("remove", { photo: null })}
            disabled={busy !== ""}
            className="btn text-sm font-bold"
            style={DANGER}
          >
            {busy === "remove" ? texts.working : <IconLabel name="trash">{texts.remove}</IconLabel>}
          </button>
        )}
        <button
          onClick={() => send("lock", { photoLocked: !locked })}
          disabled={busy !== ""}
          className="btn text-sm font-bold"
          style={locked ? CALM : DANGER}
        >
          {busy === "lock" ? (
            texts.working
          ) : (
            <IconLabel name={locked ? "check" : "ban"}>
              {locked ? texts.unlock : texts.lock}
            </IconLabel>
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
    </ProfileSection>
  );
}
