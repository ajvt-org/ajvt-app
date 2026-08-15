import { z } from "zod";
import { auth, common } from "@/lib/messages";

const INVALID = common.invalidBody;

// currentPassword is optional here on purpose: a member on a temporary password
// is not asked for it. Whether it is actually required is decided by the route
// from the database, so omitting it cannot get past the check.
export const changePasswordSchema = z.object({
  currentPassword: z.string(INVALID).min(1, INVALID).optional(),
  newPassword: z.string(INVALID).min(3, auth.passwordTooShort),
});
