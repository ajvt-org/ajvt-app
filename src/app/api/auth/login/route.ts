import { NextRequest, NextResponse } from "next/server";
import { setUserToken, signToken } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { auth } from "@/lib/messages";
import { signInMember } from "@/lib/signInServer";

export const POST = withRoute("Login", async (req: NextRequest) => {
  const { phone, password } = await req.json();
  if (!phone || !password) throw new ValidationError(auth.credentialsRequired);

  const { user, mustChangePassword } = await signInMember(phone, password, getClientIp(req));

  const token = await signToken({
    typ: "user",
    userId: user.id,
    tokenVersion: user.tokenVersion,
    mustChangePassword,
  });
  return setUserToken(NextResponse.json({ ok: true }), token);
});
