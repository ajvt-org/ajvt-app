"use client";

import type { CSSProperties, ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function VerbButton({
  icon,
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  icon: IconName;
  label: string;
  tone: CSSProperties;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={children ? undefined : label}
      className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center justify-center disabled:opacity-50"
      style={tone}
    >
      {children ? (
        <IconLabel name={icon} size={16}>
          {children}
        </IconLabel>
      ) : (
        <Icon name={icon} size={16} />
      )}
    </button>
  );
}
