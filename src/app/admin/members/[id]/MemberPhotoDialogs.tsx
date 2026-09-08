"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import { memberPhoto as texts } from "@/lib/texts";

export type PhotoAsking = "remove" | "lock";

export default function MemberPhotoDialogs({
  asking,
  busy,
  onConfirm,
  onClose,
}: {
  asking: PhotoAsking;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const remove = asking === "remove";

  return (
    <ConfirmDialog
      title={remove ? texts.remove : texts.lock}
      message={remove ? texts.confirmRemove : texts.confirmLock}
      confirmLabel={remove ? texts.remove : texts.lock}
      danger
      loading={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
