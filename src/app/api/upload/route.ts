import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

export function getUploadDir(): string {
  // In production (Render): UPLOAD_DIR points to a mounted persistent Disk
  // In development: public/uploads (served statically)
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "نوع الملف غير مدعوم (PNG/JPG فقط)" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "حجم الملف يتجاوز 5 ميغابايت" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = getUploadDir();

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ filename }, { status: 200 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
