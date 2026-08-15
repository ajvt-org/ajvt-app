"use client";

// A switch, not a checkbox: it applies the moment it is flipped, so there is
// no form to submit and nothing to confirm. Built on a real checkbox input so
// it is reachable by keyboard and announced as a switch.
export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="toggle"
      data-on={checked ? "" : undefined}
    >
      <span className="toggle-knob" />
    </button>
  );
}
