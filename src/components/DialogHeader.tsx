"use client";

import DialogBack from "./DialogBack";
import DialogClose from "./DialogClose";

// The two shapes differ in more than which control they carry. A close sits
// on the trailing edge with the title pushed away from it, while a back
// leads and the title follows straight after; spacing them apart would strand
// the title against the far edge.
export default function DialogHeader({
  title,
  onBack,
  onClose,
  sticky = true,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  sticky?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 flex items-center ${onBack ? "gap-3" : "justify-between"} ${sticky ? "sticky top-0" : ""}`}
      style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
    >
      {onBack && <DialogBack onClick={onBack} />}
      <h2 className="font-black text-white text-base label-optical">{title}</h2>
      {onClose && <DialogClose onClick={onClose} />}
    </div>
  );
}
