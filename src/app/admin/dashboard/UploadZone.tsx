"use client";

import IconLabel from "@/components/IconLabel";
import { manualAdd } from "@/lib/texts";

export default function UploadZone({
  label,
  prompt,
  preview,
  alt,
  uploading,
  onPick,
}: {
  label: string;
  prompt: string;
  preview: string | null;
  alt: string;
  uploading: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
        {label}
      </p>
      <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
        {preview ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={alt} className="max-h-32 mx-auto rounded-xl object-contain" />
            <p className="mt-1 text-xs text-center" style={{ color: "var(--mint-600)" }}>
              {uploading ? manualAdd.uploading : manualAdd.imageChange}
            </p>
          </div>
        ) : (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
            <IconLabel name="camera">{prompt}</IconLabel>
          </p>
        )}
        <input type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
      </label>
    </div>
  );
}
