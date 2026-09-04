export const OFFERED_METHODS = [
  { name: "بنكيلي", memberFacing: true },
  { name: "السداد", memberFacing: true },
  { name: "مصرفي", memberFacing: true },
  { name: "نقداً", memberFacing: false },
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
