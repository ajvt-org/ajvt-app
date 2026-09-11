"use client";

import IconLabel from "@/components/IconLabel";
import { MINT_SURFACE } from "@/components/admin/verbTones";
import { hoursLabel } from "@/lib/arabicPlural";
import { internationalPhone } from "@/lib/utils";
import { tempPassword as texts } from "@/lib/texts";

export interface TempPassword {
  password: string;
  hours: number;
}

export default function TempPasswordBox({
  value,
  hours,
  phone,
}: {
  value: string;
  hours: number;
  phone: string | null;
}) {
  const message = texts.message(value, hoursLabel(hours));
  const chat = phone
    ? `https://wa.me/${internationalPhone(phone)}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
      style={MINT_SURFACE}
    >
      <p className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
        {value}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp text-xs px-2.5 py-1.5 rounded-lg font-bold"
          >
            <IconLabel name="whatsapp">{texts.send}</IconLabel>
          </a>
        )}
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {texts.copy}
        </button>
      </div>
    </div>
  );
}
