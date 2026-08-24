import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { servePublicUpload } from "@/lib/serveUpload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return servePublicUpload(filename, async (donorPhoto) => {
    const [donation, payment] = await Promise.all([
      prisma.donation.findFirst({ where: { donorPhoto }, select: { id: true } }),
      prisma.payment.findFirst({ where: { donorPhoto }, select: { id: true } }),
    ]);
    return donation !== null || payment !== null;
  });
}
