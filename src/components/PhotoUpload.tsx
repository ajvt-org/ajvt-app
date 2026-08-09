"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  photo: string | null;
  onUpload: (filename: string) => Promise<void> | void;
  imageUrlPrefix?: string;
  label?: string;
  placeholderIcon?: string;
  variant?: "avatar" | "cover";
}

export default function PhotoUpload({
  photo,
  onUpload,
  imageUrlPrefix = "/api/files",
  label = "الصورة الشخصية",
  placeholderIcon = "👤",
  variant = "avatar",
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
      if (!upRes.ok) throw new Error(uploaded.error || "فشل رفع الصورة");

      await onUpload(uploaded.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = previewUrl || (photo ? `${imageUrlPrefix}/${photo}` : null);
  const hint = photo || previewUrl ? "انقر على الصورة لتغييرها" : "اختياري — انقر لإضافة صورة";

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
            <span className="text-3xl" style={{ color: "var(--mint-500)" }}>{placeholderIcon}</span>
          )}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 text-xs py-1 font-semibold"
            style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
          >
            {uploading ? "..." : `📷 ${hint}`}
          </div>
        </button>
        {error && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{error}</p>}
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
        className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "var(--mint-100)", border: "2px solid var(--mint-300)" }}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl" style={{ color: "var(--mint-500)" }}>{placeholderIcon}</span>
        )}
        <div
          className="absolute bottom-0 inset-x-0 flex items-center justify-center text-[10px] py-0.5"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {uploading ? "..." : "📷"}
        </div>
      </button>
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>
        {error && <p className="text-xs mt-0.5" style={{ color: "#dc2626" }}>{error}</p>}
      </div>
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
