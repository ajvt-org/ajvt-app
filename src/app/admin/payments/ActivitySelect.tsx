"use client";

import type { ActivityOption } from "./paymentTypes";

export default function ActivitySelect({
  id,
  activities,
  value,
  onChange,
  className = "input text-xs",
  style,
}: {
  id?: string;
  activities: ActivityOption[];
  value: string;
  onChange: (activityId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
    >
      <option value="">دعم عام للرابطة</option>
      {activities.map((activity) => (
        <option key={activity.id} value={activity.id}>
          {activity.title}
        </option>
      ))}
    </select>
  );
}
