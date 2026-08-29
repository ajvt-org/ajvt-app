"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ProfileSection from "@/components/admin/ProfileSection";
import { api, errorMessage } from "@/lib/api";
import { photoLock as texts } from "@/lib/texts";

export default function PhotoLockCard({
  memberId,
  locked,
  onChanged,
}: {
  memberId: string;
  locked: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/admin/members/${memberId}`, { photoLocked: !locked });
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileSection icon="camera" title={texts.title}>
      <p className="text-sm font-bold" style={{ color: locked ? "#991b1b" : "var(--text-main)" }}>
        <IconLabel name={locked ? "ban" : "check"}>
          {locked ? texts.lockedNow : texts.openNow}
        </IconLabel>
      </p>
      {!locked && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.lockNote}
        </p>
      )}
      <button
        onClick={toggle}
        disabled={busy}
        className="btn text-sm font-bold"
        style={
          locked
            ? { background: "var(--mint-100)", color: "var(--mint-700)" }
            : { background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }
        }
      >
        {busy ? (
          texts.working
        ) : (
          <IconLabel name={locked ? "check" : "ban"}>
            {locked ? texts.unlock : texts.lock}
          </IconLabel>
        )}
      </button>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
    </ProfileSection>
  );
}
