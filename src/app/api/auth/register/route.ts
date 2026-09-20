import { NextRequest, NextResponse } from "next/server";
import { setUserToken, signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { HttpError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { registerSchema } from "./schema";
import { registerMember } from "@/lib/memberRegisterServer";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const POST = withRoute("POST /api/auth/register", async (req: NextRequest) => {
  const key = `register:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    throw new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
  }
  recordFailedAttempt(key, WINDOW_MS);

  const user = await registerMember(parse(registerSchema, await req.json()));

  const token = await signToken({ typ: "user", userId: user.id, tokenVersion: user.tokenVersion });
  return setUserToken(NextResponse.json({ ok: true }, { status: 201 }), token);
});
