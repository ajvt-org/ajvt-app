import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { withRoute } from "@/lib/route";
import { proofReuseOf } from "@/lib/proofReuse";
import { viewerOf } from "@/lib/supportViewer";
import { processImage } from "@/lib/imageProcessing";
import { proofHash } from "@/lib/proofHash";
import { MAX_UPLOAD_SIZE, READABLE_UPLOAD_TYPES } from "@/lib/uploadLimits";
import { declaredBodyTooLarge } from "@/lib/uploadRequestSize";
import { ValidationError } from "@/lib/errors";
import { uploads } from "@/lib/messages";

export const POST = withRoute("POST /api/admin/proof-check", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.payments);

  if (declaredBodyTooLarge(req.headers.get("content-length")))
    throw new ValidationError(uploads.tooLarge);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) throw new ValidationError(uploads.noFile);
  if (!READABLE_UPLOAD_TYPES.includes(file.type))
    throw new ValidationError(uploads.unsupportedType);
  if (file.size > MAX_UPLOAD_SIZE) throw new ValidationError(uploads.tooLarge);

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new ValidationError(uploads.unreadableImage);
  }

  const reuse = await proofReuseOf(proofHash(processed.full), viewerOf(session));
  return NextResponse.json({ reuse });
});
