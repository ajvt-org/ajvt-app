import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { expenses as messages } from "./messages";
import { tagIncome } from "./tagIncome";

const NAME_MAX = 30;

function checkedName(name: unknown): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) throw new ValidationError(messages.tagNameRequired);
  if (value.length > NAME_MAX) throw new ValidationError(messages.tagNameTooLong);
  return value;
}

export async function listFinanceTags() {
  const tags = await prisma.financeTag.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      expenses: { select: { amount: true } },
      payments: {
        where: { status: "ACTIVE" },
        select: { purpose: true, amount: true, feeApplied: true },
      },
    },
  });

  return tags.map((tag) => {
    const income = tagIncome(tag.payments);
    return {
      id: tag.id,
      name: tag.name,
      count: tag.expenses.length,
      total: tag.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      incomeCount: income.count,
      income: income.total,
    };
  });
}

export async function createFinanceTag(name: unknown) {
  const wanted = checkedName(name);

  const existing = await prisma.financeTag.findUnique({ where: { name: wanted } });
  if (existing) throw new ConflictError(messages.tagExists);

  return prisma.financeTag.create({ data: { name: wanted } });
}

export async function renameFinanceTag(id: string, name: unknown) {
  const wanted = checkedName(name);

  const existing = await prisma.financeTag.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(messages.tagNotFound);

  const clash = await prisma.financeTag.findUnique({ where: { name: wanted } });
  if (clash && clash.id !== id) throw new ConflictError(messages.tagExists);

  const tag = await prisma.financeTag.update({ where: { id }, data: { name: wanted } });
  return { tag, existing };
}

export async function removeFinanceTag(id: string) {
  const existing = await prisma.financeTag.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(messages.tagNotFound);

  await prisma.financeTag.delete({ where: { id } });
  return existing;
}
