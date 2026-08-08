import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        member: {
          select: {
            fullName: true,
            phone: true,
            age: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" }, { status: 404 });
    }

    return NextResponse.json({
      phone: user.phone,
      member: user.member || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…" }, { status: 500 });
  }
}
