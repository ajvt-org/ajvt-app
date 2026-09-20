import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { paymentAccounts as messages } from "./messages";
import {
  nextAccountPosition,
  openAccountRows,
  readCode,
  readName,
  swappedAccountPositions,
} from "./paymentMethodAdmin";
import { accountsOf } from "./paymentAccountsServer";
import { paymentMethodOrNotFound } from "./paymentMethodAdminServer";

const MAX = 30;

function checkedCode(value: unknown): string {
  const code = readCode(value);
  if (!code) throw new ValidationError(messages.codeRequired);
  if (code.length > MAX) throw new ValidationError(messages.codeTooLong);
  return code;
}

function checkedLabel(value: unknown): string {
  const label = readName(value);
  if (label.length > MAX) throw new ValidationError(messages.labelTooLong);
  return label;
}

async function refuseCodeClash(methodId: string, code: string): Promise<void> {
  const clash = await prisma.paymentAccount.findUnique({
    where: { methodId_code: { methodId, code } },
  });
  if (clash) throw new ConflictError(messages.exists);
}

export async function accountOrNotFound(methodId: string, accountId: string) {
  const account = await prisma.paymentAccount.findFirst({
    where: { id: accountId, methodId },
  });
  if (!account) throw new NotFoundError(messages.notFound);
  return account;
}

export async function createPaymentAccount(
  methodId: string,
  body: { code?: unknown; label?: unknown },
) {
  const method = await paymentMethodOrNotFound(methodId);
  if (!method.carriesNumbers) throw new ConflictError(messages.methodTakesNoNumbers);

  const code = checkedCode(body.code);
  const label = checkedLabel(body.label);
  await refuseCodeClash(methodId, code);

  const account = await prisma.paymentAccount.create({
    data: {
      methodId,
      code,
      label: label || null,
      position: nextAccountPosition(await accountsOf(methodId)),
    },
  });

  return { account, method };
}

export async function reorderPaymentAccount(
  methodId: string,
  accountId: string,
  move: "up" | "down",
) {
  const pair = swappedAccountPositions(
    openAccountRows(await accountsOf(methodId)),
    accountId,
    move,
  );
  if (!pair) return null;

  const [mine, other] = pair;
  await prisma.$transaction([
    prisma.paymentAccount.update({ where: { id: mine.id }, data: { position: other.position } }),
    prisma.paymentAccount.update({ where: { id: other.id }, data: { position: mine.position } }),
  ]);

  return {
    account: await prisma.paymentAccount.findUnique({ where: { id: accountId } }),
    from: mine.position,
    to: other.position,
  };
}

export async function changePaymentAccount(
  accountId: string,
  body: { code?: unknown; label?: unknown; active?: unknown },
) {
  if (body.code !== undefined) throw new ValidationError(messages.codeIsFixed);

  const data: { label?: string | null; active?: boolean } = {};
  if (body.label !== undefined) data.label = checkedLabel(body.label) || null;
  if (typeof body.active === "boolean") data.active = body.active;

  return prisma.paymentAccount.update({ where: { id: accountId }, data });
}

export async function replacePaymentAccount(
  methodId: string,
  accountId: string,
  body: { code?: unknown; label?: unknown },
) {
  const closing = await accountOrNotFound(methodId, accountId);
  if (closing.closedAt) throw new ConflictError(messages.alreadyClosed);

  const code = checkedCode(body.code);
  if (code === closing.code) throw new ValidationError(messages.sameCode);
  const label = checkedLabel(body.label);
  await refuseCodeClash(methodId, code);

  const closedAt = new Date();
  const position = nextAccountPosition(await accountsOf(methodId));

  const opened = await prisma.$transaction(async (tx) => {
    await tx.paymentAccount.update({ where: { id: accountId }, data: { closedAt, active: false } });
    return tx.paymentAccount.create({
      data: { methodId, code, label: label || null, position },
    });
  });

  return { closing, opened, closedAt };
}
