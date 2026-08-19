"use client";

export default function PhoneInput({
  id,
  value,
  onChange,
  placeholder = "2XXXXXXX",
}: {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="tel"
      autoComplete="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        onChange(digits);
      }}
      placeholder={placeholder}
      dir="ltr"
      maxLength={8}
      className="input"
      style={{ letterSpacing: "0.15em" }}
    />
  );
}
