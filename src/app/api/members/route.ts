import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { fullName, phone, age, paymentMethod, paymentProof } = await req.json();

    if (!fullName || !phone || !age || !paymentMethod || !paymentProof) {
      return NextResponse.json({ error: "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ù…Ø·Ù„ÙˆØ¨Ø©" }, { status: 400 });
    }

    // Check if user already submitted
    const existing = await prisma.member.findUnique({ where: { userId: session.userId } });
    if (existing) {
      return NextResponse.json({ error: "Ù„Ù‚Ø¯ Ù‚Ø¯Ù…Øª Ø·Ù„Ø¨Ø§Ù‹ Ù…Ø³Ø¨Ù‚Ø§Ù‹" }, { status: 409 });
    }

    const member = await prisma.member.create({
      data: {
        userId: session.userId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim(),
        paymentMethod,
        paymentProof,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­" }, { status: 401 });
    }
    console.error("Member create error:", err);
    return NextResponse.json({ error: "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…" }, { status: 500 });
  }
}
