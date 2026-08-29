import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { generateTempPassword } from "@/lib/member";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ConflictError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { accounts, villages as villageMessages } from "@/lib/messages";
import { ageForVillage, isKnownVillage } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { adminPersonCreateSchema } from "./schema";

export const POST = withRoute("POST /api/admin/people", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { accountPhone, phoneUnknown, fullName, age, village, photo } = parse(
    adminPersonCreateSchema,
    await req.json(),
  );

  if (!isKnownVillage(village, await villageNames())) {
    return NextResponse.json({ error: villageMessages.unknownVillage }, { status: 400 });
  }

  const phone = phoneUnknown ? null : accountPhone!.trim();
  if (phone && (await prisma.user.count({ where: { phone } }))) {
    throw new ConflictError(accounts.phoneTaken);
  }

  const tempPassword = phone ? generateTempPassword() : undefined;

  const person = await prisma.user.create({
    data: {
      phone,
      password: tempPassword ? await bcrypt.hash(tempPassword, 12) : null,
      fullName,
      age: ageForVillage(village, age),
      village,
      photo: photo || null,
    },
    select: { id: true, phone: true, fullName: true, age: true, village: true },
  });

  await logAction(session.username, "CREATE_PERSON", fullName, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: person.id,
    after: { fullName, age: person.age, village, phone },
  });

  return NextResponse.json({ person, tempPassword }, { status: 201 });
});
