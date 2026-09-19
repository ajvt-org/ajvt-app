import { NextRequest, NextResponse } from "next/server";
import { requireUser, setUserToken, signToken } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { changePasswordSchema } from "./schema";
import { changeMemberPassword } from "@/lib/passwordServer";

export const POST = withRoute("POST /api/user/password", async (req: NextRequest) => {
  const session = await requireUser({ allowTempPassword: true });
  const { currentPassword, newPassword } = parse(changePasswordSchema, await req.json());

  const user = await changeMemberPassword(session, currentPassword, newPassword);

  const token = await signToken({
    typ: "user",
    userId: user.id,
    tokenVersion: user.tokenVersion,
    mustChangePassword: false,
  });
  return setUserToken(NextResponse.json({ ok: true }), token);
});
