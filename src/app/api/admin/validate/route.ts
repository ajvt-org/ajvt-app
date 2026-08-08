import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, action } = await req.json();

    if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± ØµØ§Ù„Ø­Ø©" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { status: action },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­" }, { status: 401 });
    }
    console.error("Validate error:", err);
    return NextResponse.json({ error: "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…" }, { status: 500 });
  }
}
