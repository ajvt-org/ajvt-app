import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { members, money } from "./messages";
import { generateReferenceCode } from "./referenceCode";
import { isUniqueViolation, uniqueViolationFields } from "./prismaError";
import { recordMembershipPayment } from "./membershipPaymentServer";
import { selfRecorder } from "./membershipRecorder";
import { saveMembershipYear } from "./membershipRecord";
import { currentMembershipPaid } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { membershipState } from "./membershipState";
import { accountIsOpenOn } from "./paymentMethods";
import type { MethodWithAccounts } from "./paymentMethods";
import { readBankReference } from "./bankReference";
import { nameOf } from "./person";
import { releaseUploads } from "./uploadRelease";

const CODE_ATTEMPTS = 5;

export interface Submission {
  id?: string | null;
  paymentMethod: string;
  accountId?: string | null;
  bankReference?: string | null;
  paymentProof: string;
  paidAmount: unknown;
  referenceCode?: string | null;
  surplusAnonymous?: boolean;
}

export interface MembershipSettings {
  membershipFee: number;
  membershipYear: number;
  payable: MethodWithAccounts[];
}

export async function submitMembership(
  userId: string,
  input: Submission,
  settings: MembershipSettings,
) {
  const { membershipFee, membershipYear } = settings;
  const chosen = settings.payable.find((method) => method.name === input.paymentMethod);
  const declared = input.accountId;
  const requireUsableAccount = (held: string | null) => {
    if (declared && declared !== held && !accountIsOpenOn(chosen, declared)) {
      throw new ValidationError(money.paymentAccountInvalid);
    }
  };
  const accountId = declared || null;
  const bankReference = readBankReference(input.bankReference) || null;

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { fullName: true, memberships: { select: { id: true }, take: 1 } },
  });
  if (!person.fullName?.trim()) throw new ValidationError(members.profileIncomplete);

  const payment = {
    method: input.paymentMethod,
    accountId,
    bankReference,
    proof: input.paymentProof,
    recorder: selfRecorder(nameOf(person)),
    anonymous: input.surplusAnonymous,
  };

  if (input.id) {
    if (input.id !== userId) throw new NotFoundError(members.notFound);
    const current = await currentMembershipPaid(prisma, userId);
    if (!current) throw new NotFoundError(members.notFound);
    if (membershipState(asMembershipState(current), membershipYear) === "ENDED") {
      throw new ConflictError(members.membershipEnded);
    }
    if (current.status === "ACTIVE") throw new ConflictError(members.alreadyAccepted);
    requireUsableAccount(current.accountId);

    await prisma.$transaction(async (tx) => {
      await saveMembershipYear(tx, userId, current.year, {
        status: "PENDING",
        rejectionReason: null,
      });
      await recordMembershipPayment(tx, userId, Number(input.paidAmount), membershipFee, {
        ...payment,
        ...(!current.referenceCode && input.referenceCode
          ? { referenceCode: input.referenceCode }
          : {}),
        status: "PENDING",
      });
    });
    await releaseUploads(current.paymentProof);
    return { resubmitted: true as const, referenceCode: null };
  }

  if (person.memberships.length) throw new ConflictError(members.alreadyHasRequest);
  requireUsableAccount(null);

  let code: string | null = input.referenceCode || null;

  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        await saveMembershipYear(tx, userId, membershipYear, { status: "PENDING" });
        await recordMembershipPayment(tx, userId, Number(input.paidAmount), membershipFee, {
          ...payment,
          referenceCode: code,
          status: "PENDING",
        });
      });
      return { resubmitted: false as const, referenceCode: code };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (uniqueViolationFields(err).includes("userId")) {
        throw new ConflictError(members.alreadyHasRequest);
      }
      if (!code || attempt >= CODE_ATTEMPTS) {
        throw new ConflictError(members.referenceCodeTaken);
      }
      code = generateReferenceCode();
    }
  }
}
