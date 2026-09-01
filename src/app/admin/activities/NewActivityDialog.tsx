"use client";

import DialogHeader from "@/components/DialogHeader";
import NewActivityForm from "./NewActivityForm";
import type { NewActivityDraft } from "./activityTypes";
import { activityForm as texts } from "@/lib/texts";

export default function NewActivityDialog({
  onCreate,
  onClose,
}: {
  onCreate: (draft: NewActivityDraft) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader title={texts.dialogTitle} onClose={onClose} />
        <div className="p-4">
          <NewActivityForm
            onCreate={async (draft) => {
              await onCreate(draft);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
