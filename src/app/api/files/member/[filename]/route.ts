import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { servePublicUpload } from "@/lib/serveUpload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return servePublicUpload(filename, async (photo) => {
    const person = await prisma.user.findFirst({ where: { photo }, select: { id: true } });
    return person !== null;
  });
}
