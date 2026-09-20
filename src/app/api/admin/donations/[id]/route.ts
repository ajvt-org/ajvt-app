import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { acceptedNames } from "@/lib/paymentMethods";
import { donationUpdateSchema } from "./schema";
import { donorNameOnRecord } from "@/lib/donorName";
import { viewerOf } from "@/lib/supportViewer";
import { donationView } from "@/lib/donationView";
import { logLabelFor, logSnapshotFor } from "@/lib/auditSupport";
import { donationLogSnapshot, donationWasChanged } from "@/lib/donationChangeLog";
import { money as amountText } from "@/lib/money";
import { releaseUploads } from "@/lib/uploadRelease";
import { linkedDonorName, loadGift, removeGift } from "@/lib/giftWriteServer";
import { updateGift } from "@/lib/giftUpdateServer";

export const PATCH = withRoute(
  "PATCH /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;

    const existing = await loadGift(id);
    const accepted = acceptedNames(await offeredMethodNames(), existing.paymentMethod);
    const edit = parse(donationUpdateSchema(accepted), await req.json());

    const gift = await updateGift(id, existing, edit);
    const typed = donorNameOnRecord(
      { donorName: existing.donorName, userId: gift.userId, user: gift.user },
      viewer,
    );
    const target = { ...auditContext(session, req), targetType: "Donation", targetId: gift.id };

    if (edit.status !== undefined) {
      await logAction(
        session.username,
        edit.status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION",
        logLabelFor(gift, typed),
        { ...target, before: { status: existing.status }, after: { status: gift.status } },
      );
    }
    if (edit.userId !== undefined) {
      const wasNamed = await linkedDonorName(existing.userId, viewer);
      const nowNamed = edit.userId ? donorNameOnRecord(gift, viewer) : null;
      await logAction(
        session.username,
        edit.userId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        logLabelFor(gift, nowNamed ? `${wasNamed ?? typed} → ${nowNamed}` : (wasNamed ?? typed)),
        {
          ...target,
          before: logSnapshotFor(gift, {
            userId: existing.userId,
            donorName: existing.donorName,
          }),
          after: logSnapshotFor(gift, { userId: gift.userId, donorName: gift.donorName }),
        },
      );
    }
    if (donationWasChanged(edit)) {
      await logAction(
        session.username,
        "UPDATE_DONATION",
        logLabelFor(gift, donorNameOnRecord(gift, viewer)),
        {
          ...target,
          before: logSnapshotFor(gift, existing),
          after: logSnapshotFor(gift, donationLogSnapshot(gift)),
        },
      );
    }

    await releaseUploads(existing.proof, existing.donorPhoto);

    return NextResponse.json({ donation: donationView(gift, viewer) });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;

    const existing = await removeGift(id);

    await logAction(
      session.username,
      "DELETE_DONATION",
      logLabelFor(
        existing,
        `${donorNameOnRecord(
          { donorName: existing.donorName, userId: existing.userId, user: existing.user },
          viewer,
        )} — ${amountText(existing.amount ?? 0)}`,
      ),
      {
        ...auditContext(session, req),
        targetType: "Donation",
        targetId: id,
        before: logSnapshotFor(existing, existing),
      },
    );

    return NextResponse.json({ ok: true });
  },
);
