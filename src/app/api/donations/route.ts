import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getUploadDir } from "@/app/api/upload/route";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Public, unauthenticated endpoint (donors don't have an account) — handles
// its own upload instead of going through /api/upload, which requires a
// session. Rate-limited by IP since anyone can call this.
export async function POST(req: NextRequest) {
  try {
    const key = `donate:${getClientIp(req)}`;
    if (isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، حاول لاحقاً" }, { status: 429 });
    }
    recordFailedAttempt(key, WINDOW_MS);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const donorNameRaw = formData.get("donorName");
    const amountRaw = formData.get("amount");
    const memberIdRaw = formData.get("memberId");

    if (!file) return NextResponse.json({ error: "يرجى إرفاق صورة إثبات الدفع" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم (PNG/JPG فقط)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم الملف يتجاوز 5 ميغابايت" }, { status: 400 });
    }

    // A logged-in ACTIVE member donating from /home is identified — no
    // anonymity choice, real name always attributed. Anyone else (no
    // session, or memberId omitted) stays on the public/anonymous flow this
    // route was originally built for.
    let memberId: string | null = null;
    let selfName: string | null = null;
    if (typeof memberIdRaw === "string" && memberIdRaw.trim()) {
      const session = await getUserSession();
      if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
      const { userId } = session as { userId: string };
      const member = await prisma.member.findUnique({
        where: { id: memberIdRaw.trim() },
        select: { userId: true, status: true, fullName: true },
      });
      if (!member || member.userId !== userId || member.status !== "ACTIVE") {
        return NextResponse.json({ error: "عضو غير صالح" }, { status: 403 });
      }
      memberId = memberIdRaw.trim();
      selfName = member.fullName;
    }

    let donorName: string | null = selfName;
    if (!selfName && typeof donorNameRaw === "string" && donorNameRaw.trim()) {
      if (donorNameRaw.trim().length > 50) {
        return NextResponse.json({ error: "الاسم طويل جداً (50 حرفاً كحد أقصى)" }, { status: 400 });
      }
      donorName = donorNameRaw.trim();
    }

    const n = Number(amountRaw);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" }, { status: 400 });
    }
    const amount = n;

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    await prisma.donation.create({
      data: {
        donorName,
        amount,
        proof: filename,
        memberId,
        source: memberId ? "SELF" : "PUBLIC",
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Donation error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
