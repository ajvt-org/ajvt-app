import { uploads } from "@/lib/messages";
import { prepareImageForUpload } from "@/lib/imageForUpload";
export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", await prepareImageForUpload(file), file.name);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || uploads.failed);
  return data.filename as string;
}
