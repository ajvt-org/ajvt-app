import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { adminMemberUpdateSchema } from "./schema";
import { nameOf } from "@/lib/person";
import { updateMember } from "@/lib/memberUpdateServer";
import { deleteMember } from "@/lib/memberDeleteServer";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const edit = parse(adminMemberUpdateSchema, await req.json());

    const { existing, person, attached } = await updateMember(id, edit, session);

    const onMember = { ...auditContext(session, req), targetType: "Member" as const, targetId: id };

    await logAction(session.username, "UPDATE_MEMBER", `${nameOf(existing)} → ${nameOf(person)}`, {
      ...onMember,
      before: { ...existing },
      after: { fullName: person.fullName, age: person.age, village: person.village },
    });

    if (edit.photo === null && existing.photo !== null) {
      await logAction(session.username, "REMOVE_MEMBER_PHOTO", nameOf(person), {
        ...onMember,
        before: { photo: existing.photo },
        after: { photo: null },
      });
    }

    if (edit.photoLocked !== undefined && edit.photoLocked !== existing.photoLocked) {
      await logAction(
        session.username,
        edit.photoLocked ? "LOCK_MEMBER_PHOTO" : "UNLOCK_MEMBER_PHOTO",
        nameOf(person),
        {
          ...onMember,
          before: { photoLocked: existing.photoLocked },
          after: { photoLocked: edit.photoLocked },
        },
      );
    }

    if (attached) {
      const account = edit.accountPhone!.trim();
      await logAction(session.username, "ATTACH_MEMBER_ACCOUNT", `${nameOf(person)} — ${account}`, {
        ...onMember,
        before: { userId: null },
        after: { userId: attached.userId, account },
      });
    }

    return NextResponse.json({
      member: { id, ...person },
      tempPassword: attached?.tempPassword,
      tempPasswordHours: attached?.tempPasswordHours,
    });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { confirmName } = await req.json().catch(() => ({ confirmName: undefined }));

    const { person, forgotten } = await deleteMember(
      id,
      String(confirmName ?? ""),
      session.username,
    );

    await logAction(session.username, "DELETE_MEMBER", nameOf(person), {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { fullName: person.fullName, age: person.age },
      meta: forgotten ?? undefined,
    });

    return NextResponse.json({ ok: true });
  },
);
