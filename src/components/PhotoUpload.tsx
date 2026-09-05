"use client";

import { useRef, useState } from "react";
import { type IconName } from "./Icon";
import { AvatarFrame, CoverFrame, HeroFrame, type FrameProps } from "./PhotoFrames";
import { photoUpload as texts } from "@/lib/texts";

interface PhotoUploadProps {
  photo: string | null;
  onUpload: (filename: string) => Promise<void> | void;
  locked?: boolean;
  lockedNote?: string;
  imageUrlPrefix?: string;
  label?: string;
  placeholderIcon?: IconName;
  variant?: "avatar" | "cover" | "hero";
  bare?: boolean;
  showHint?: boolean;
}

const FRAMES = {
  hero: HeroFrame,
  cover: CoverFrame,
  avatar: AvatarFrame,
} as const;

export default function PhotoUpload({
  photo,
  onUpload,
  locked = false,
  lockedNote,
  imageUrlPrefix = "/api/files",
  label = texts.defaultLabel,
  placeholderIcon = "user",
  variant = "avatar",
  bare = false,
  showHint = true,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError("");
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploaded = await upRes.json();
      if (!upRes.ok) throw new Error(uploaded.error || texts.uploadFailed);

      await onUpload(uploaded.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.unexpectedError);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = previewUrl || (photo ? `${imageUrlPrefix}/${photo}` : null);
  const hint =
    locked && lockedNote ? lockedNote : photo || previewUrl ? texts.changeHint : texts.addHint;
  const noteBelow = locked && lockedNote && (variant !== "avatar" || bare);
  const Frame = FRAMES[variant];
  const frame: FrameProps = {
    displayUrl,
    label,
    hint,
    uploading,
    locked,
    placeholderIcon,
    onPick: () => inputRef.current?.click(),
  };

  const note = (
    <>
      {noteBelow && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {lockedNote}
        </p>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      {!locked && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      )}
    </>
  );

  if (variant === "hero") {
    return (
      <>
        <Frame {...frame} />
        {note}
      </>
    );
  }

  if (variant === "cover") {
    return (
      <div>
        <Frame {...frame} />
        {note}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Frame {...frame} />
      {!bare && (
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {label}
          </p>
          {showHint && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {hint}
            </p>
          )}
        </div>
      )}
      {note}
    </div>
  );
}
