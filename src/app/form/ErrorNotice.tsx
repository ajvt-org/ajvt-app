"use client";

import IconLabel from "@/components/IconLabel";

export default function ErrorNotice({
  error,
  children,
}: {
  error: string;
  children?: React.ReactNode;
}) {
  if (!error) return null;
  return (
    <div
      className="p-4 rounded-xl text-sm font-semibold"
      style={{ background: "#fee2e2", color: "#991b1b" }}
    >
      <IconLabel name="warning">{error}</IconLabel>
      {children}
    </div>
  );
}
