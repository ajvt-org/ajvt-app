import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { paymentMethods as messages } from "./messages";
import {
  adminAccountRows,
  adminMethodRows,
  nextPosition,
  numbersHoldPayments,
  readName,
  swappedPositions,
} from "./paymentMethodAdmin";
import { allPaymentMethods } from "./paymentMethodsServer";
import { accountsOf, accountUsage } from "./paymentAccountsServer";

const NAME_MAX = 30;

function checkedName(value: unknown): string {
  const name = readName(value);
  if (!name) throw new ValidationError(messages.nameRequired);
  if (name.length > NAME_MAX) throw new ValidationError(messages.nameTooLong);
  return name;
}

async function refuseNameClash(name: string, keeping?: string): Promise<void> {
  const clash = await prisma.paymentMethod.findUnique({ where: { name } });
  if (clash && clash.id !== keeping) throw new ConflictError(messages.exists);
}

export async function paymentMethodRows() {
  const methods = await allPaymentMethods();
  const accounts = await prisma.paymentAccount.findMany({
    select: {
      id: true,
      methodId: true,
      code: true,
      label: true,
      position: true,
      active: true,
      closedAt: true,
    },
  });
  const usage = await accountUsage();
  const [expenses, payments] = await Promise.all([
    prisma.expense.groupBy({ by: ["method"], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["method"], _count: { _all: true } }),
  ]);

  const rows = adminMethodRows(methods, [
    ...expenses.map((row) => ({ name: row.method, count: row._count._all })),
    ...payments.map((row) => ({ name: row.method, count: row._count._all })),
  ]);

  return rows.map((method) => ({
    ...method,
    accounts: adminAccountRows(
      accounts.filter((account) => account.methodId === method.id),
      usage,
    ),
  }));
}

export async function paymentMethodOrNotFound(id: string) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) throw new NotFoundError(messages.notFound);
  return method;
}

export async function createPaymentMethod(body: { name?: unknown; memberFacing?: unknown }) {
  const name = checkedName(body.name);
  await refuseNameClash(name);

  return prisma.paymentMethod.create({
    data: {
      name,
      memberFacing: body.memberFacing === true,
      position: nextPosition(await allPaymentMethods()),
    },
  });
}

export async function reorderPaymentMethod(id: string, move: "up" | "down") {
  const pair = swappedPositions(await allPaymentMethods(), id, move);
  if (!pair) return null;

  const [mine, other] = pair;
  await prisma.$transaction([
    prisma.paymentMethod.update({ where: { id: mine.id }, data: { position: other.position } }),
    prisma.paymentMethod.update({ where: { id: other.id }, data: { position: mine.position } }),
  ]);

  return {
    method: await prisma.paymentMethod.findUnique({ where: { id } }),
    from: mine.position,
    to: other.position,
  };
}

interface HeldMethod {
  id: string;
  name: string;
  carriesNumbers: boolean;
}

export interface MethodEdit {
  name?: unknown;
  active?: unknown;
  memberFacing?: unknown;
  carriesNumbers?: unknown;
}

export async function changePaymentMethod(existing: HeldMethod, body: MethodEdit) {
  const data: {
    name?: string;
    active?: boolean;
    memberFacing?: boolean;
    carriesNumbers?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = checkedName(body.name);
    await refuseNameClash(name, existing.id);
    data.name = name;
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.memberFacing === "boolean") data.memberFacing = body.memberFacing;

  if (typeof body.carriesNumbers === "boolean") {
    if (!body.carriesNumbers && existing.carriesNumbers) {
      const rows = adminAccountRows(await accountsOf(existing.id), await accountUsage());
      if (numbersHoldPayments(rows)) throw new ConflictError(messages.numbersHoldPayments);
    }
    data.carriesNumbers = body.carriesNumbers;
  }

  return prisma.$transaction(async (tx) => {
    const saved = await tx.paymentMethod.update({ where: { id: existing.id }, data });
    if (data.name && data.name !== existing.name) {
      await Promise.all([
        tx.expense.updateMany({ where: { method: existing.name }, data: { method: data.name } }),
        tx.payment.updateMany({ where: { method: existing.name }, data: { method: data.name } }),
      ]);
    }
    return saved;
  });
}
