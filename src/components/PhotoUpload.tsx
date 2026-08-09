"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  memberId: string;
  photo: string | null;
  onUpdated: (photo: string | null) => void;
}

export default function PhotoUpload({ memberId, photo, onUpdated }: PhotoUploadProps) {
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

      const patchRes = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: uploaded.filename }),
      });
      const patched = await patchRes.json();
      if (!patchRes.ok) throw new Error(patched.error || "فشل حفظ الصورة");

      onUpdated(patched.photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = previewUrl || (photo ? `/api/files/${photo}` : null);

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
          <img src={displayUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl" style={{ color: "var(--mint-500)" }}>👤</span>
        )}
        <div
          className="absolute bottom-0 inset-x-0 flex items-center justify-center text-[10px] py-0.5"
          style={{ background: "rgba(26,63,51,0.75)", color: "white" }}
        >
          {uploading ? "..." : "📷"}
        </div>
      </button>
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>الصورة الشخصية</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {photo || previewUrl ? "انقر على الصورة لتغييرها" : "اختياري — انقر لإضافة صورة"}
        </p>
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
