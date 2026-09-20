import { NextRequest } from "next/server";
import { servePublicUpload } from "@/lib/serveUpload";
import { teamLogoIsInUse } from "@/lib/publicUploadServer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return servePublicUpload(filename, teamLogoIsInUse);
}
