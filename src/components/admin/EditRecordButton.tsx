"use client";

import VerbButton from "@/components/admin/VerbButton";
import { SAFE } from "@/components/admin/verbTones";

export default function EditRecordButton({
  label,
  closeLabel,
  open,
  disabled,
  onClick,
}: {
  label: string;
  closeLabel?: string;
  open?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const shut = Boolean(open && closeLabel);

  return (
    <VerbButton
      icon={shut ? "close" : "pencil"}
      label={shut && closeLabel ? closeLabel : label}
      tone={SAFE}
      disabled={disabled}
      onClick={onClick}
    />
  );
}
