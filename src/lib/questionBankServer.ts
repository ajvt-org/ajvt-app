import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { isUniqueViolation } from "./prismaError";

export const DEFAULT_BANK_ID = "general";
export const DEFAULT_BANK_NAME = "البنك العام";
export const TUTORIAL_BANK_ID = "tutorial";
export const TUTORIAL_BANK_NAME = "بنك الجولة التجريبية";
export const NO_BANK = "بنك الأسئلة غير موجود";
export const NAME_REQUIRED = "اسم البنك مطلوب";
export const NAME_TAKEN = "يوجد بنك بهذا الاسم";
export const BANK_NOT_EMPTY = "البنك يحتوي على أسئلة، انقلها أو احذفها أولاً";
export const TUTORIAL_BANK_KEPT = "بنك الجولة التجريبية لا يُحذف، لأن الجولة التجريبية تقرأ منه";

function banksWithCounts() {
  return prisma.questionBank.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { questions: true } } },
  });
}

export async function listBanks() {
  const banks = await banksWithCounts();
  if (banks.some((bank) => bank.id === TUTORIAL_BANK_ID)) return banks;

  await defaultBank();
  await tutorialBank();
  return banksWithCounts();
}

export async function defaultBank() {
  const existing = await prisma.questionBank.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.questionBank
    .create({ data: { id: DEFAULT_BANK_ID, name: DEFAULT_BANK_NAME } })
    .catch(() => prisma.questionBank.findFirstOrThrow({ orderBy: { createdAt: "asc" } }));
}

export async function tutorialBank() {
  const existing = await prisma.questionBank.findUnique({ where: { id: TUTORIAL_BANK_ID } });
  if (existing) return existing;
  return prisma.questionBank
    .create({ data: { id: TUTORIAL_BANK_ID, name: TUTORIAL_BANK_NAME } })
    .catch(() => prisma.questionBank.findUniqueOrThrow({ where: { id: TUTORIAL_BANK_ID } }));
}

export async function requireBank(id?: string | null) {
  if (!id) return defaultBank();
  const bank = await prisma.questionBank.findUnique({ where: { id } });
  if (!bank) throw new NotFoundError(NO_BANK);
  return bank;
}

function cleanName(name: unknown): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) throw new ValidationError(NAME_REQUIRED);
  return value;
}

export async function createBank(name: unknown) {
  try {
    return await prisma.questionBank.create({ data: { name: cleanName(name) } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError(NAME_TAKEN);
    throw err;
  }
}

export async function renameBank(id: string, name: unknown) {
  await requireBank(id);
  try {
    return await prisma.questionBank.update({ where: { id }, data: { name: cleanName(name) } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError(NAME_TAKEN);
    throw err;
  }
}

export async function deleteBank(id: string) {
  const bank = await requireBank(id);
  if (bank.id === TUTORIAL_BANK_ID) throw new ConflictError(TUTORIAL_BANK_KEPT);
  const questions = await prisma.quizQuestion.count({ where: { bankId: bank.id } });
  if (questions > 0) throw new ConflictError(BANK_NOT_EMPTY);
  await prisma.questionBank.delete({ where: { id: bank.id } });
  return bank;
}
