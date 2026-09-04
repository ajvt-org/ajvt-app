import { prisma } from "./prisma";
import {
  inOrder,
  memberMethods,
  methodNames,
  offeredMethods,
  payableMethods,
  type MethodWithAccounts,
  type PaymentMethodOption,
} from "./paymentMethods";
import { PAYABLE_METHODS } from "./paymentCodes";

const SELECT = {
  id: true,
  name: true,
  memberFacing: true,
  active: true,
  position: true,
} as const;

const WITH_ACCOUNTS = {
  ...SELECT,
  accounts: {
    select: {
      id: true,
      code: true,
      label: true,
      position: true,
      active: true,
      closedAt: true,
    },
  },
} as const;

export async function methodsWithAccounts(): Promise<MethodWithAccounts[]> {
  return prisma.paymentMethod.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: WITH_ACCOUNTS,
  });
}

export async function allPaymentMethods(): Promise<PaymentMethodOption[]> {
  return prisma.paymentMethod.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: SELECT,
  });
}

export async function offeredMethodNames(): Promise<string[]> {
  return methodNames(offeredMethods(await allPaymentMethods()));
}

export async function memberMethodNames(): Promise<string[]> {
  return methodNames(memberMethods(await allPaymentMethods()));
}

export async function orderedMethodNames(): Promise<string[]> {
  return methodNames(inOrder(await allPaymentMethods()));
}

export async function payableMethodNames(): Promise<string[]> {
  return methodNames(payableMethods(await allPaymentMethods(), PAYABLE_METHODS));
}
