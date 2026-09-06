"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ProfileSection from "@/components/admin/ProfileSection";
import { api, errorMessage } from "@/lib/api";
import { memberPhoto as texts } from "@/lib/texts";

const DANGER = { background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" } as const;
const CALM = { background: "var(--mint-100)", color: "var(--mint-700)" } as const;

type Asking = "remove" | "lock";

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
  const [asking, setAsking] = useState<Asking | null>(null);

  async function send(what: string, body: Record<string, unknown>) {
    setBusy(what);
    setError("");
    setAsking(null);
    try {
      await api.patch(`/api/admin/members/${memberId}`, body);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }

  function toggleLock() {
    if (!locked && photo) return setAsking("lock");
    send("lock", { photoLocked: !locked });
  }

  return (
    <ProfileSection
      icon="camera"
      title={texts.title}
      badge={locked && <span className="badge badge-rejected">{texts.lockedBadge}</span>}
    >
      {!photo && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {photo && (
          <button
            onClick={() => setAsking("remove")}
            disabled={busy !== ""}
            className="btn text-sm font-bold"
            style={DANGER}
          >
            {busy === "remove" ? texts.working : <IconLabel name="trash">{texts.remove}</IconLabel>}
          </button>
        )}
        <button
          onClick={toggleLock}
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

      {asking === "remove" && (
        <ConfirmDialog
          title={texts.remove}
          message={texts.confirmRemove}
          confirmLabel={texts.remove}
          danger
          loading={busy !== ""}
          onConfirm={() => send("remove", { photo: null })}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === "lock" && (
        <ConfirmDialog
          title={texts.lock}
          message={texts.confirmLock}
          confirmLabel={texts.lock}
          danger
          loading={busy !== ""}
          onConfirm={() => send("lock", { photoLocked: true })}
          onClose={() => setAsking(null)}
        />
      )}
    </ProfileSection>
  );
}
