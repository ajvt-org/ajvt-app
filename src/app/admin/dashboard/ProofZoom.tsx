"use client";

import Icon from "@/components/Icon";

export default function ProofZoom({
  filename,
  onClose,
}: {
  filename: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/files/${filename}`}
        alt="كابتير"
        className="max-w-full max-h-full object-contain rounded-2xl"
      />
      <button
        aria-label="إغلاق"
        className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
        style={{ background: "rgba(255,255,255,0.15)" }}
        onClick={onClose}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
