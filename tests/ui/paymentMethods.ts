function account(id: string, code: string) {
  return { id, code, label: null };
}

export const OFFERED_METHODS = [
  { name: "بنكيلي", memberFacing: true, accounts: [account("a1", "111111")] },
  { name: "السداد", memberFacing: true, accounts: [account("a2", "222222")] },
  { name: "مصرفي", memberFacing: true, accounts: [account("a3", "333333")] },
  { name: "نقداً", memberFacing: false, accounts: [] },
];

const METHODS_URL = "/api/payment-methods";

export function isMethodsCall(url: unknown): boolean {
  return typeof url === "string" && url.startsWith(METHODS_URL);
}

export function methodsResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ methods: OFFERED_METHODS }),
  };
}

export function answering(rest: (url: unknown, init?: RequestInit) => unknown) {
  return (url: unknown, init?: RequestInit) =>
    isMethodsCall(url) ? Promise.resolve(methodsResponse()) : rest(url, init);
}

export function sentBody(calls: unknown[][]): Record<string, unknown> {
  const sent = calls.find((call) => !isMethodsCall(call[0]) && (call[1] as RequestInit)?.body);
  if (!sent) throw new Error("nothing was sent");
  return JSON.parse((sent[1] as RequestInit).body as string);
}
