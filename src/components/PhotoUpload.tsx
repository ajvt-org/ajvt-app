"use client";

import { useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";
import IconLabel from "./IconLabel";
import { photoUpload as texts } from "@/lib/texts";

interface PhotoUploadProps {
  photo: string | null;
  onUpload: (filename: string) => Promise<void> | void;
  imageUrlPrefix?: string;
  label?: string;
  placeholderIcon?: IconName;
  variant?: "avatar" | "cover" | "hero";
  bare?: boolean;
}

export default function PhotoUpload({
  photo,
  onUpload,
  imageUrlPrefix = "/api/files",
  label = texts.defaultLabel,
  placeholderIcon = "user",
  variant = "avatar",
  bare = false,
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
  const hint = photo || previewUrl ? texts.changeHint : texts.addHint;

  // The profile opens on the person, so the picture is the page's first thing
  // rather than a card of its own further down.
  if (variant === "hero") {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={hint}
          className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background: "var(--mint-100)",
            border: "3px solid #fff",
            boxShadow: "0 2px 12px rgba(26, 63, 51, 0.14)",
          }}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: "var(--mint-500)" }}>
              <Icon name="user" size={40} />
            </span>
          )}
          <span
            className="absolute bottom-0 inset-x-0 flex items-center justify-center py-1"
            style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
          >
            {uploading ? "..." : <Icon name="camera" size={14} />}
          </span>
        </button>
        {error && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </>
    );
  }

  if (variant === "cover") {
    return (
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative w-full h-32 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "var(--mint-100)", border: "2px dashed var(--mint-300)" }}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: "var(--mint-500)" }}>
              <Icon name={placeholderIcon} size={30} />
            </span>
          )}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 text-xs py-1 font-semibold"
            style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
          >
            {uploading ? "..." : <IconLabel name="camera">{hint}</IconLabel>}
          </div>
        </button>
        {error && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={label}
        className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "var(--mint-100)", border: "2px solid var(--mint-300)" }}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: "var(--mint-500)" }}>
            <Icon name={placeholderIcon} size={24} />
          </span>
        )}
        <div
          className="absolute bottom-0 inset-x-0 flex items-center justify-center text-[10px] py-0.5"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {uploading ? "..." : <Icon name="camera" size={11} />}
        </div>
      </button>
      {!bare && (
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {label}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        </div>
      )}
      {error && (
        <p className="text-xs mt-0.5" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
