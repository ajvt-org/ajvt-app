import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { accounts, members } from "./messages";
import { issueMembership } from "./member";
import { validatePaidAmount } from "./donations";
import { getAppSettings } from "./settingsServer";
import { addMembership } from "./membershipCreate";
import { adminRecorder } from "./membershipRecorder";
import { accountIdError } from "./paymentAccountsServer";

export interface AddedMembership {
  paymentMethod: string;
  accountId?: string | null;
  paymentProof?: string | null;
  paidAmount?: unknown;
  surplusAnonymous?: boolean;
  status: "ACTIVE" | "PENDING";
}

interface Recorder {
  username: string;
  adminId: string;
}

export async function addMembershipToPerson(id: string, input: AddedMembership, session: Recorder) {
  const wrongAccount = await accountIdError(input.paymentMethod, input.accountId, null);
  if (wrongAccount) throw new ValidationError(wrongAccount);

  const person = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      memberNumber: true,
      memberships: { select: { id: true }, take: 1 },
    },
  });
  if (!person) throw new NotFoundError(accounts.notFound);
  if (person.memberships.length) throw new ConflictError(members.accountAlreadyHasMember);

  const { membershipFee, membershipYear } = await getAppSettings();

  let paidAmount: number | null = null;
  const given = input.paidAmount;
  if (given !== undefined && given !== null && String(given).trim() !== "") {
    const error = validatePaidAmount(given, membershipFee);
    if (error) throw new ValidationError(error);
    paidAmount = Number(given);
  }

  const needsNumber = input.status === "ACTIVE" && !person.memberNumber;

  await prisma.$transaction(async (tx) =>
    addMembership(tx, {
      userId: person.id,
      paymentMethod: input.paymentMethod.trim(),
      accountId: input.accountId || null,
      paymentProof: input.paymentProof || null,
      paidAmount,
      surplusAnonymous: input.surplusAnonymous ?? false,
      status: input.status,
      membershipYear,
      fee: membershipFee,
      recorder: adminRecorder(session),
      issued: needsNumber ? await issueMembership(tx) : undefined,
    }),
  );

  return { person, paidAmount, membershipYear };
}
