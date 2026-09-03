"use client";

import Icon from "@/components/Icon";
import ProofUpload from "@/components/ProofUpload";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import { toThumbUrl } from "@/lib/utils";
import { expenseProofs as texts } from "@/lib/texts";

export default function ExpenseProofsField({
  proofs,
  expenseId,
  onChange,
}: {
  proofs: string[];
  expenseId: string | null;
  onChange: (proofs: string[]) => void;
}) {
  return (
    <div>
      <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
        {texts.heading}
      </p>

      {proofs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {proofs.map((filename, at) => (
            <div key={filename} className="relative">
              <a
                href={`/api/files/${filename}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={texts.open(at + 1)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toThumbUrl(`/api/files/${filename}`)}
                  alt={texts.open(at + 1)}
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                  className="w-18 h-18 rounded-xl object-cover"
                  style={{ width: 72, height: 72, border: "1px solid var(--mint-200)" }}
                />
              </a>
              <button
                type="button"
                onClick={() => onChange(proofs.filter((kept) => kept !== filename))}
                aria-label={texts.remove(at + 1)}
                className="absolute -top-1.5 -left-1.5 rounded-full flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  background: "white",
                  border: "1px solid var(--mint-200)",
                  color: "#991b1b",
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {expenseId &&
        proofs.map((filename) => (
          <ProofReuseWarning key={filename} filename={filename} kind="expense" id={expenseId} />
        ))}

      <ProofUpload
        key={proofs.length}
        existingProof={null}
        label={proofs.length ? texts.addAnother : texts.addFirst}
        required={false}
        onUploaded={(filename) =>
          onChange(proofs.includes(filename) ? proofs : [...proofs, filename])
        }
      />
    </div>
  );
}
