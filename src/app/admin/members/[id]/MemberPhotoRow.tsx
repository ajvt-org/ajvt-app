"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { api, errorMessage } from "@/lib/api";
import { memberPhoto as texts } from "@/lib/texts";

type Asking = "remove" | "lock";

export default function MemberPhotoRow({
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          {texts.title}
          {locked && <span className="badge badge-rejected">{texts.lockedBadge}</span>}
          {!photo && <span className="text-xs">{texts.none}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {photo && (
            <button
              onClick={() => setAsking("remove")}
              disabled={busy !== ""}
              className="btn btn-sm btn-danger font-bold"
            >
              {busy === "remove" ? (
                texts.working
              ) : (
                <IconLabel name="trash">{texts.remove}</IconLabel>
              )}
            </button>
          )}
          <button
            onClick={toggleLock}
            disabled={busy !== ""}
            className={`btn btn-sm font-bold ${locked ? "btn-ghost" : "btn-danger"}`}
          >
            {busy === "lock" ? (
              texts.working
            ) : (
              <IconLabel name={locked ? "check" : "ban"}>
                {locked ? texts.unlock : texts.lock}
              </IconLabel>
            )}
          </button>
        </span>
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
    </div>
  );
}
