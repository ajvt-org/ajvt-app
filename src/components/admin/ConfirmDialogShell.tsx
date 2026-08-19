"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";

export default function ConfirmDialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl"
        style={{ background: "var(--mint-50)", direction: "rtl" }}
      >
        <DialogHeader title={<IconLabel name="warning">{title}</IconLabel>} onClose={onClose} />

        <div className="p-5 space-y-4">
          {children}

          <button
            onClick={onClose}
            className="btn w-full text-sm"
            style={{
              background: "white",
              color: "var(--text-muted)",
              border: "1px solid var(--mint-200)",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
