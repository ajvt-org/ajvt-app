"use client";

import Sheet from "@/components/Sheet";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { expenseReceipts as texts } from "@/lib/texts";

export default function ExpenseReceiptsDialog({
  proofs,
  onClose,
}: {
  proofs: string[];
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <DialogHeader title={<IconLabel name="receipt">{texts.title}</IconLabel>} onClose={onClose} />

      <div className="p-4 space-y-3">
        {proofs.map((filename, at) => (
          <a
            key={filename}
            href={`/api/files/${filename}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={texts.openOne(at + 1)}
            className="block rounded-xl overflow-hidden"
            style={{ background: "white", border: "1px solid var(--mint-200)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${filename}`}
              alt={texts.openOne(at + 1)}
              loading="lazy"
              decoding="async"
              className="w-full h-auto"
            />
          </a>
        ))}
      </div>
    </Sheet>
  );
}
