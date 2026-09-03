"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import IconLabel from "./IconLabel";
import { proofUpload } from "@/lib/texts";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.75;
const UPLOAD_TIMEOUT_MS = 30_000;

type Status = "idle" | "preparing" | "uploading" | "error" | "done";

interface ProofUploadProps {
  existingProof: string | null;
  onUploaded: (filename: string) => void;
  label?: string;
  required?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

async function compressForUpload(file: File): Promise<File | Blob> {
  if (file.size <= COMPRESS_THRESHOLD) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

function uploadWithProgress(
  body: FormData,
  onProgress: (pct: number) => void,
): Promise<{ filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { filename?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.filename) {
        resolve({ filename: data.filename });
      } else {
        reject(new Error(data.error || proofUpload.uploadFailed));
      }
    };
    xhr.onerror = () => reject(new Error(proofUpload.connectionLost));
    xhr.ontimeout = () => reject(new Error(proofUpload.tooSlow));

    xhr.send(body);
  });
}

export default function ProofUpload({
  existingProof,
  onUploaded,
  label = proofUpload.label,
  required = true,
  onUploadingChange,
}: ProofUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    onUploadingChange?.(status === "preparing" || status === "uploading");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function startUpload(file: File) {
    setPendingFile(file);
    setError("");
    setStatus("preparing");
    setProgress(0);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(proofUpload.unsupportedType);
      setStatus("error");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(proofUpload.tooLarge);
      setStatus("error");
      return;
    }

    const toSend = await compressForUpload(file);

    setStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("file", toSend, file.name);
      const { filename } = await uploadWithProgress(fd, setProgress);
      setStatus("done");
      onUploaded(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : proofUpload.unexpected);
      setStatus("error");
    }
  }

  function retry() {
    if (pendingFile) startUpload(pendingFile);
  }

  function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    startUpload(file);
  }

  const showingImage = previewUrl || existingProof;

  return (
    <div>
      <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
        {label} {required && <span style={{ color: "var(--copper-500)" }}>*</span>}
      </p>

      {showingImage ? (
        <div className="upload-zone" style={{ cursor: "default" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl || `/api/files/${existingProof}`}
            alt={proofUpload.imageAlt}
            className="max-h-48 mx-auto rounded-xl object-contain"
          />

          {status === "uploading" && (
            <div className="mt-2">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--mint-100)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: "var(--mint-600)" }}
                />
              </div>
              <p
                className="mt-1 text-xs text-center font-semibold"
                style={{ color: "var(--mint-600)" }}
              >
                {proofUpload.uploading(progress)}
              </p>
            </div>
          )}

          {status === "preparing" && (
            <p
              className="mt-2 text-xs text-center font-semibold"
              style={{ color: "var(--mint-600)" }}
            >
              {proofUpload.preparing}
            </p>
          )}

          {status === "done" && (
            <p
              className="mt-2 text-xs text-center font-semibold"
              style={{ color: "var(--mint-600)" }}
            >
              <IconLabel name="check">{proofUpload.uploaded}</IconLabel>
            </p>
          )}

          {status === "error" && (
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
                <IconLabel name="warning">{error}</IconLabel>
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-1.5 text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                {proofUpload.retry}
              </button>
            </div>
          )}

          {status !== "uploading" && status !== "preparing" && (
            <div className="flex gap-2 mt-2 justify-center">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <IconLabel name="camera">{proofUpload.newPhoto}</IconLabel>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <IconLabel name="image">{proofUpload.fromGallery}</IconLabel>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="upload-zone" style={{ display: "block" }}>
          <div className="text-center">
            <div className="flex justify-center mb-2" style={{ color: "var(--mint-500)" }}>
              <Icon name="camera" size={40} />
            </div>
            <p className="font-bold text-sm" style={{ color: "var(--mint-700)" }}>
              {proofUpload.prompt}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {proofUpload.hint}
            </p>
            <div className="flex gap-2 mt-3 justify-center">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="text-xs px-3 py-2 rounded-lg font-bold"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                <IconLabel name="camera">{proofUpload.takePhoto}</IconLabel>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="text-xs px-3 py-2 rounded-lg font-bold"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <IconLabel name="image">{proofUpload.pickFromGallery}</IconLabel>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* capture opens the camera directly on mobile; the gallery input has
          no capture attribute, so it always opens the normal file picker. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePicked}
        style={{ display: "none" }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handlePicked}
        style={{ display: "none" }}
      />
    </div>
  );
}
