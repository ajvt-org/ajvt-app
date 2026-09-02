import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { servePublicUpload } from "@/lib/serveUpload";
import { CONFIDENTIAL_SELECT, nameIsConfidential } from "@/lib/supportPrivacy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return servePublicUpload(filename, async (donorPhoto) => {
    const [donation, payment] = await Promise.all([
      prisma.donation.findFirst({
        where: { donorPhoto },
        select: { userId: true, user: { select: CONFIDENTIAL_SELECT } },
      }),
      prisma.payment.findFirst({
        where: { donorPhoto },
        select: { userId: true, user: { select: CONFIDENTIAL_SELECT } },
      }),
    ]);
    const row = donation ?? payment;
    return row !== null && !nameIsConfidential(row);
  });
}
