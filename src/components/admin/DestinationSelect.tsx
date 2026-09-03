"use client";

import { optionsOfKind, type DestinationOption } from "@/lib/moneyDestination";
import { destinationPicker } from "@/lib/texts";

export default function DestinationSelect({
  id,
  destinations,
  value,
  onChange,
  emptyLabel = destinationPicker.general,
  className = "input text-xs",
  style,
}: {
  id?: string;
  destinations: DestinationOption[];
  value: string;
  onChange: (destinationId: string) => void;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const activities = optionsOfKind(destinations, "activity");
  const competitions = optionsOfKind(destinations, "competition");

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
    >
      <option value="">{emptyLabel}</option>
      {activities.length > 0 && (
        <optgroup label={destinationPicker.activities}>
          {activities.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </optgroup>
      )}
      {competitions.length > 0 && (
        <optgroup label={destinationPicker.competitions}>
          {competitions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
