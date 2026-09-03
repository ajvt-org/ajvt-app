import { prisma } from "./prisma";
import {
  inOrder,
  memberMethods,
  methodNames,
  offeredMethods,
  type PaymentMethodOption,
} from "./paymentMethods";

const SELECT = {
  id: true,
  name: true,
  memberFacing: true,
  active: true,
  position: true,
} as const;

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
